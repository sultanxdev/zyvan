// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Controller
// HTTP request parsing, validation, and response formatting
// Scoped to Organization for multi-tenant isolation.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateEventSchema, EventFilterSchema } from '@zyvan/validation';
import { getPrismaClient } from '@zyvan/db';
import * as eventService from './service';

/**
 * POST /v1/events
 * Ingest a new event into the organization. Returns 202 Accepted.
 */
export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const parsed = CreateEventSchema.parse(req.body);

    let projectId = (req.auth as any).projectId || (req.body.projectId as string) || (req.headers['x-project-id'] as string);

    if (!projectId) {
      const prisma = getPrismaClient();
      const firstProj = await prisma.project.findFirst({ where: { organizationId: orgId } });
      if (firstProj) {
        projectId = firstProj.id;
      } else {
        res.status(400).json({
          code: 'bad_request',
          message: 'A project is required for event ingestion',
          request_id: req.requestId || 'unknown',
        });
        return;
      }
    }

    const result = await eventService.ingestEvent(
      orgId,
      projectId,
      parsed.type,
      parsed.idempotency_key,
      parsed.data,
      parsed.headers
    );

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
 * List events with filters and cursor-based pagination for caller's organization.
 */
export async function listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const projectId = (req.query.projectId as string) || (req.auth as any).projectId;

    const filters = EventFilterSchema.parse({
      eventType: req.query.eventType,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      search: req.query.search,
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });

    const result = await eventService.listEvents(orgId, projectId, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/events/:id
 * Get a single event with full delivery timeline (scoped to organization).
 */
export async function getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const event = await eventService.getEvent(req.params.id as string, orgId);

    if (!event) {
      res.status(404).json({
        code: 'not_found',
        message: 'Event not found in this organization',
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
