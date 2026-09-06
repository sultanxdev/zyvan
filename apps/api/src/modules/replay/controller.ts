// ─────────────────────────────────────────────────────────────
// Zyvan API — Replay Controller
// HTTP request handling for replaying failed or dead-letter events.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateReplaySchema } from '@zyvan/schemas';
import * as replayService from './service';

/**
 * POST /v1/events/:id/replay
 * Replay an event. Creates new delivery lineage.
 */
export async function replayEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateReplaySchema.parse(req.body || {});
    const eventId = req.params.id as string;

    const results = await replayService.replayEvent(
      eventId,
      req.auth!.projectId,
      parsed.destinationId
    );

    // Return the primary replay record or list
    if (results.length === 1) {
      res.status(202).json({
        replay_id: results[0].replay_id,
        delivery_id: results[0].delivery_id,
        event_id: results[0].event_id,
        status: results[0].status,
      });
      return;
    }

    res.status(202).json({
      replays: results,
      status: 'queued',
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
    next(err);
  }
}
