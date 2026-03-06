import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { IngestEventSchema } from './validator';
import { ingestEvent, enqueueEvent } from '../../core/ingest';
import { db } from '../../config/db';

export const eventRouter = Router();

// All event routes require a valid API key
eventRouter.use(authMiddleware);

// ─────────────────────────────────────────────────────────
// POST /v1/events — ingest a new event
// ─────────────────────────────────────────────────────────
eventRouter.post(
    '/',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
            if (!idempotencyKey?.trim()) {
                res.status(400).json({ error: 'Idempotency-Key header is required' });
                return;
            }

            const parsed = IngestEventSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: parsed.error.flatten().fieldErrors,
                });
                return;
            }

            const { event, isNew } = await ingestEvent(parsed.data, idempotencyKey);

            if (isNew) {
                // Enqueue AFTER transaction commits — workers see the committed row
                await enqueueEvent(event.id);
                res.status(202).json({
                    event_id: event.id,
                    status: 'accepted',
                    idempotency_key: idempotencyKey,
                });
            } else {
                // Idempotent response — same data, 200 instead of 202
                res.status(200).json({
                    event_id: event.id,
                    status: 'already_accepted',
                    idempotency_key: idempotencyKey,
                });
            }
        } catch (err: any) {
            if (err.code === 'ENDPOINT_NOT_FOUND') {
                res.status(404).json({ error: 'Endpoint not found or is inactive' });
                return;
            }
            next(err);
        }
    }
);

// ─────────────────────────────────────────────────────────
// GET /v1/events — list events (with filter support)
// ─────────────────────────────────────────────────────────
eventRouter.get(
    '/',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { status, endpoint_id, limit = '20', offset = '0' } = req.query;

            const events = await db.event.findMany({
                where: {
                    ...(status && { status: status as any }),
                    ...(endpoint_id && { endpointId: endpoint_id as string }),
                },
                orderBy: { createdAt: 'desc' },
                take: Math.min(Number(limit), 100), // cap at 100
                skip: Math.max(Number(offset), 0),
                include: { _count: { select: { attempts: true } } },
            });

            res.json({
                data: events,
                count: events.length,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ─────────────────────────────────────────────────────────
// GET /v1/events/:id — get event + full attempt history
// ─────────────────────────────────────────────────────────
eventRouter.get(
    '/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const event = await db.event.findUnique({
                where: { id: req.params.id },
                include: {
                    attempts: { orderBy: { attemptNumber: 'asc' } },
                    endpoint: {
                        select: { id: true, url: true, maxRetries: true, timeoutMs: true },
                    },
                },
            });

            if (!event) {
                res.status(404).json({ error: 'Event not found' });
                return;
            }

            res.json(event);
        } catch (err) {
            next(err);
        }
    }
);

// ─────────────────────────────────────────────────────────
// POST /v1/events/replay/bulk — replay multiple DLQ events
// MUST be registered BEFORE /:id/replay so Express does not
// match 'replay' as the :id param and route to the wrong handler.
// ─────────────────────────────────────────────────────────
eventRouter.post(
    '/replay/bulk',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { event_ids } = req.body as { event_ids?: string[] };

            if (!Array.isArray(event_ids) || event_ids.length === 0) {
                res.status(400).json({ error: 'event_ids array is required and must be non-empty' });
                return;
            }

            if (event_ids.length > 100) {
                res.status(400).json({ error: 'Cannot replay more than 100 events at once' });
                return;
            }

            const results = await Promise.allSettled(
                event_ids.map(async (id) => {
                    const event = await db.event.findUnique({ where: { id } });
                    if (!event) throw new Error(`${id}: not found`);
                    if (event.status !== 'DEAD_LETTERED') throw new Error(`${id}: not DEAD_LETTERED (is ${event.status})`);

                    await db.event.update({
                        where: { id },
                        data: { status: 'DISPATCHING', retryCount: 0, failureReason: null },
                    });
                    await enqueueEvent(id);
                    return id;
                })
            );

            const replayed = results
                .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
                .map((r) => r.value);

            const failed = results
                .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
                .map((r) => r.reason?.message ?? 'Unknown error');

            res.json({ replayed, failed });
        } catch (err) {
            next(err);
        }
    }
);

// ─────────────────────────────────────────────────────────
// POST /v1/events/:id/replay — replay a dead-lettered event
// ─────────────────────────────────────────────────────────
eventRouter.post(
    '/:id/replay',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const event = await db.event.findUnique({ where: { id: req.params.id } });

            if (!event) {
                res.status(404).json({ error: 'Event not found' });
                return;
            }

            if (event.status !== 'DEAD_LETTERED') {
                res.status(409).json({
                    error: `Only DEAD_LETTERED events can be replayed. Current status: ${event.status}`,
                });
                return;
            }

            await db.event.update({
                where: { id: event.id },
                data: { status: 'DISPATCHING', retryCount: 0, failureReason: null },
            });

            await enqueueEvent(event.id);

            res.json({ event_id: event.id, status: 'replaying' });
        } catch (err) {
            next(err);
        }
    }
);
