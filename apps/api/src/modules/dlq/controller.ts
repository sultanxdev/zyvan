// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Controller
// HTTP request handling for inspecting dead letter deliveries.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import * as dlqService from './service';

/**
 * GET /v1/dead-letters
 * List dead-lettered deliveries with event and destination summary.
 */
export async function listDeadLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const result = await dlqService.listDeadLetters(req.auth!.projectId, cursor, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/dead-letters/:id
 * Get detailed dead-letter entry with full attempt timeline.
 */
export async function getDeadLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deadLetter = await dlqService.getDeadLetter(req.params.id as string, req.auth!.projectId);

    if (!deadLetter) {
      res.status(404).json({
        code: 'not_found',
        message: 'Dead letter record not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: deadLetter });
  } catch (err) {
    next(err);
  }
}
