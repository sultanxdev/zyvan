// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Controller
// HTTP request parsing, validation, and response formatting
// for event ingestion and query endpoints.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateEventSchema, EventFilterSchema } from '@zyvan/schemas';
import * as eventService from './service';

/**
 * POST /v1/events
 * Ingest a new event. Returns 202 Accepted.
 *
 * The API does NOT wait for delivery to complete —
 * events are durably stored and queued for async processing.
 */
export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateEventSchema.parse(req.body);

    const result = await eventService.ingestEvent(
      req.auth!.projectId,
      parsed.tenant_id,
      parsed.type,
      parsed.idempotency_key,
      parsed.data,
      parsed.headers
    );

    // 202 for new events, 200 for idempotent duplicates
    const statusCode = result.duplicate ? 200 : 202;

    res.status(statusCode).json(result);
  } catch (err: any) {
    if (err.code === 'not_found') {
      res.status(404).json({
        code: 'not_found',
        message: err.message,
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }
    if (err.code === 'conflict') {
      res.status(409).json({
        code: 'conflict',
        message: err.message,
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }
    next(err);
  }
}

/**
 * GET /v1/events
 * List events with filters and cursor-based pagination.
 */
export async function listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = EventFilterSchema.parse({
      eventType: req.query.eventType,
      tenantId: req.query.tenantId,
      destinationId: req.query.destinationId,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      search: req.query.search,
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });

    const result = await eventService.listEvents(req.auth!.projectId, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/events/:id
 * Get a single event with full delivery/attempt timeline.
 */
export async function getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await eventService.getEvent(req.params.id as string, req.auth!.projectId);

    if (!event) {
      res.status(404).json({
        code: 'not_found',
        message: 'Event not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: event });
  } catch (err) {
    next(err);
  }
}
