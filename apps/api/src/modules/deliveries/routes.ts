// ─────────────────────────────────────────────────────────────
// Zyvan API — Delivery Routes
// GET /v1/destinations/:destinationId/deliveries — List deliveries
//
// Mounted at /v1/destinations in app.ts, so paths here are
// relative to that prefix.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import { authorize } from '../../middleware/authorize';
import * as deliveryRepo from './repository';

const router = Router();

/**
 * GET /v1/destinations/:destinationId/deliveries
 * List deliveries for a specific destination.
 */
router.get(
  '/:destinationId/deliveries',
  authorize('events:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { destinationId } = req.params;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await deliveryRepo.listByDestination(
        destinationId as string,
        req.auth!.projectId,
        cursor,
        Math.min(Math.max(limit, 1), 100)
      );

      res.json({
        data: result.deliveries,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.nextCursor !== null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as deliveryRoutes };
