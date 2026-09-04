// ─────────────────────────────────────────────────────────────
// Zyvan API — Destination Controller
// HTTP request parsing, validation, and response formatting
// for destination management endpoints.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateDestinationSchema, UpdateDestinationSchema } from '@zyvan/schemas';
import * as destinationService from './service';

/**
 * POST /v1/destinations
 * Create a new destination.
 */
export async function createDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateDestinationSchema.parse(req.body);

    const destination = await destinationService.createDestination(
      req.auth!.projectId,
      parsed.tenantId,
      parsed.url,
      parsed.secret,
      parsed.retryPolicy,
      parsed.rateLimit
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
 * List all destinations in the authenticated project.
 */
export async function listDestinations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const destinations = await destinationService.listDestinations(req.auth!.projectId);
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
    const destination = await destinationService.getDestination(req.params.id as string, req.auth!.projectId);

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found',
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
    const parsed = UpdateDestinationSchema.parse(req.body);
    const destination = await destinationService.updateDestination(
      req.params.id as string,
      req.auth!.projectId,
      parsed
    );

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found',
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
 * Pause a destination. Queued events remain — workers skip delivery.
 */
export async function pauseDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const destination = await destinationService.pauseDestination(req.params.id as string, req.auth!.projectId);

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found',
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
    const destination = await destinationService.resumeDestination(req.params.id as string, req.auth!.projectId);

    if (!destination) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found',
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
 * POST /v1/destinations/:id/test
 * Send a test payload to the destination.
 */
export async function testDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await destinationService.testDestination(req.params.id as string, req.auth!.projectId);
    res.json({ data: result });
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
    next(err);
  }
}

/**
 * DELETE /v1/destinations/:id
 * Delete a destination.
 */
export async function deleteDestination(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await destinationService.deleteDestination(req.params.id as string, req.auth!.projectId);

    if (!deleted) {
      res.status(404).json({
        code: 'not_found',
        message: 'Destination not found',
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
