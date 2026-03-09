import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { isSafeUrl, isHttpsUrl } from '../../core/ssrf-guard';

export const endpointRouter = Router();

// All endpoint routes require authentication
endpointRouter.use(authMiddleware);

// ── Validation Schemas ─────────────────────────────────────────────────

const CreateEndpointSchema = z.object({
    url: z.string().url({ message: 'url must be a valid URL' }),
    max_retries: z.number().int().min(0).max(20).optional().default(5),
    timeout_ms: z.number().int().min(1000).max(60000).optional().default(30000),
    name: z.string().max(100).optional(),
});

const UpdateEndpointSchema = z.object({
    url: z.string().url().optional(),
    max_retries: z.number().int().min(0).max(20).optional(),
    timeout_ms: z.number().int().min(1000).max(60000).optional(),
    is_active: z.boolean().optional(),
    name: z.string().max(100).optional(),
});

// ── POST /v1/endpoints — Register a new endpoint ──────────────────────

endpointRouter.post(
    '/',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = CreateEndpointSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: parsed.error.flatten().fieldErrors,
                });
                return;
            }

            const { url, max_retries, timeout_ms, name } = parsed.data;

            // Quick sync check first (fast path rejection)
            if (!isHttpsUrl(url)) {
                res.status(400).json({ error: 'Endpoint URL must use HTTPS' });
                return;
            }

            // Full SSRF check (DNS resolution)
            const safe = await isSafeUrl(url);
            if (!safe) {
                res.status(400).json({
                    error: 'URL is unsafe — it targets a private network, reserved IP range, or cannot be resolved',
                });
                return;
            }

            // Generate a signing secret (shown only on creation)
            const signingSecret = crypto.randomBytes(32).toString('hex');

            const endpoint = await db.endpoint.create({
                data: {
                    url,
                    signingSecret,
                    maxRetries: max_retries,
                    timeoutMs: timeout_ms,
                    name: name ?? null,
                },
            });

            // Return signing_secret ONLY on creation — it will never be retrievable again
            res.status(201).json({
                id: endpoint.id,
                name: endpoint.name,
                url: endpoint.url,
                signing_secret: signingSecret, // ← shown once only
                max_retries: endpoint.maxRetries,
                timeout_ms: endpoint.timeoutMs,
                is_active: endpoint.isActive,
                created_at: endpoint.createdAt,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /v1/endpoints — List all active endpoints ─────────────────────

endpointRouter.get(
    '/',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { active } = req.query;
            // Default to active only unless active=false is passed
            const where = active === 'false' ? {} : { isActive: true };

            const endpoints = await db.endpoint.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    maxRetries: true,
                    timeoutMs: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: { select: { events: true } },
                },
            });

            res.json({
                data: endpoints.map((ep) => ({
                    id: ep.id,
                    name: ep.name,
                    url: ep.url,
                    max_retries: ep.maxRetries,
                    timeout_ms: ep.timeoutMs,
                    is_active: ep.isActive,
                    event_count: ep._count.events,
                    created_at: ep.createdAt,
                    updated_at: ep.updatedAt,
                })),
                count: endpoints.length,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /v1/endpoints/:id — Get a single endpoint ─────────────────────

endpointRouter.get(
    '/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const endpoint = await db.endpoint.findUnique({
                where: { id: req.params.id },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    maxRetries: true,
                    timeoutMs: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: { select: { events: true } },
                },
            });

            if (!endpoint) {
                res.status(404).json({ error: 'Endpoint not found' });
                return;
            }

            res.json({
                id: endpoint.id,
                name: endpoint.name,
                url: endpoint.url,
                max_retries: endpoint.maxRetries,
                timeout_ms: endpoint.timeoutMs,
                is_active: endpoint.isActive,
                event_count: endpoint._count.events,
                created_at: endpoint.createdAt,
                updated_at: endpoint.updatedAt,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── PATCH /v1/endpoints/:id — Update endpoint config ─────────────────

endpointRouter.patch(
    '/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = UpdateEndpointSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: parsed.error.flatten().fieldErrors,
                });
                return;
            }

            const { url, max_retries, timeout_ms, is_active, name } = parsed.data;

            // SSRF check on new URL if provided
            if (url !== undefined) {
                if (!isHttpsUrl(url)) {
                    res.status(400).json({ error: 'Endpoint URL must use HTTPS' });
                    return;
                }
                const safe = await isSafeUrl(url);
                if (!safe) {
                    res.status(400).json({ error: 'URL is unsafe — targets a private or reserved network' });
                    return;
                }
            }

            const endpoint = await db.endpoint.findUnique({ where: { id: req.params.id } });
            if (!endpoint) {
                res.status(404).json({ error: 'Endpoint not found' });
                return;
            }

            const updated = await db.endpoint.update({
                where: { id: req.params.id },
                data: {
                    ...(url !== undefined && { url }),
                    ...(max_retries !== undefined && { maxRetries: max_retries }),
                    ...(timeout_ms !== undefined && { timeoutMs: timeout_ms }),
                    ...(is_active !== undefined && { isActive: is_active }),
                    ...(name !== undefined && { name }),
                },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    maxRetries: true,
                    timeoutMs: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            res.json({
                id: updated.id,
                name: updated.name,
                url: updated.url,
                max_retries: updated.maxRetries,
                timeout_ms: updated.timeoutMs,
                is_active: updated.isActive,
                created_at: updated.createdAt,
                updated_at: updated.updatedAt,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── DELETE /v1/endpoints/:id — Soft delete (deactivate) ────────────────

endpointRouter.delete(
    '/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const endpoint = await db.endpoint.findUnique({ where: { id: req.params.id } });
            if (!endpoint) {
                res.status(404).json({ error: 'Endpoint not found' });
                return;
            }

            await db.endpoint.update({
                where: { id: req.params.id },
                data: { isActive: false },
            });

            res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
);
