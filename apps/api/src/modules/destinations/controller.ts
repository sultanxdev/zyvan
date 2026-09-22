// ─────────────────────────────────────────────────────────────
// Zyvan API — Destination Controller
// HTTP request parsing, validation, and response formatting
// Scoped to Organization for multi-tenant isolation.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateDestinationSchema, UpdateDestinationSchema } from '@zyvan/validation';
import * as destinationService from './service';

/**
 * POST /v1/destinations
 * Create a new destination within caller's organization.
 */
export async function createDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const parsed = CreateDestinationSchema.parse(req.body);

    const projectId =
      (req.body.projectId as string) ||
      (req.auth as any).projectId ||
      parsed.tenantId; // fallback for backwards compatibility

    const destination = await destinationService.createDestination(
      orgId,
      projectId,
      (req.body.name as string) || `Destination`,
      parsed.url,
      parsed.secret,
      parsed.retryPolicy,
      parsed.rateLimit,
      (req.body.events as string[]) || ['*']
    );

    res.status(201).json({ data: destination });
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
    if (err.code === 'invalid_request') {
      res.status(400).json({
        code: 'invalid_request',
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
 * GET /v1/destinations
 * List all destinations in caller's organization.
 */
export async function listDestinations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const projectId = (req.query.projectId as string) || (req.auth as any).projectId;
    const destinations = await destinationService.listDestinations(orgId, projectId);
    res.json({ data: destinations });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/destinations/:id
 * Get a single destination by ID.
 */
export async function getDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const destination = await destinationService.getDestination(req.params.id as string, orgId);

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found in this organization',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: destination });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /v1/destinations/:id
 * Update a destination.
 */
export async function updateDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const parsed = UpdateDestinationSchema.parse(req.body);
    const destination = await destinationService.updateDestination(
      req.params.id as string,
      orgId,
      {
        ...parsed,
        name: req.body.name,
        events: req.body.events,
      }
    );

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found in this organization',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: destination });
  } catch (err: any) {
    if (err.code === 'invalid_request') {
      res.status(400).json({
        code: 'invalid_request',
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
 * POST /v1/destinations/:id/pause
 * Pause a destination.
 */
export async function pauseDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const destination = await destinationService.pauseDestination(req.params.id as string, orgId);

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found in this organization',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: destination, message: 'Destination paused' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /v1/destinations/:id/resume
 * Resume a paused destination.
 */
export async function resumeDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const destination = await destinationService.resumeDestination(req.params.id as string, orgId);

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found in this organization',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: destination, message: 'Destination resumed' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /v1/destinations/:id
 * Delete a destination.
 */
export async function deleteDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const deleted = await destinationService.deleteDestination(req.params.id as string, orgId);

    if (!deleted) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found in this organization',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ message: 'Destination deleted successfully' });
  } catch (err) {
    next(err);
  }
}
