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
 * Ingest a new event → 202 Accepted.
 * The API does NOT wait for the webhook HTTP request to complete.
 */
export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateEventSchema.parse(req.body);

    const { event, duplicate } = await eventService.createEvent(req.auth!.projectId, parsed);

    if (duplicate) {
      // Return existing event with 200 (idempotent response)
      res.status(200).json({
        event_id: event.id,
        status: event.status,
        created_at: event.createdAt,
        duplicate: true,
      });
      return;
    }

    // 202 Accepted — event is durably stored, delivery is queued
    res.status(202).json({
      event_id: event.id,
      status: 'queued',
      created_at: event.createdAt,
    });
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
    if (err.code === 'invalid_request') {
      res.status(400).json({
        code: 'invalid_request',
        message: err.message,
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }
    // Handle Prisma unique constraint violation (idempotency race condition)
    if (err.code === 'P2002') {
      // Concurrent request with same idempotency key — find and return existing
      try {
        const parsed = CreateEventSchema.parse(req.body);
        const existing = await eventService.getEvent(err.meta?.target?.[0] || '', req.auth!.projectId);
        if (existing) {
          res.status(200).json({
            event_id: existing.id,
            status: existing.status,
            created_at: existing.createdAt,
            duplicate: true,
          });
          return;
        }
      } catch {
        // Fall through to generic error
      }
      res.status(409).json({
        code: 'duplicate_idempotency_key',
        message: 'An event already exists for this idempotency key',
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
 * List events with filters and cursor pagination.
 */
export async function listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = EventFilterSchema.parse({
      eventType: req.query.eventType,
      tenantId: req.query.tenantId,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      cursor: req.query.cursor,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    const { events, nextCursor } = await eventService.listEvents(req.auth!.projectId, filters);

    res.json({
      data: events,
      next_cursor: nextCursor,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/events/:id
 * Get event detail with full delivery timeline and attempt history.
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
