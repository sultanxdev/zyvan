// ─────────────────────────────────────────────────────────────
// Zyvan API — Delivery Routes
// GET /v1/destinations/:id/deliveries — List deliveries for a destination
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import { authorize } from '../../middleware/authorize';
import * as deliveryRepo from './repository';

const router = Router();

/**
 * GET /v1/destinations/:id/deliveries
 * List deliveries for a specific destination.
 */
router.get(
  '/:id/deliveries',
  authorize('events:read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { deliveries, nextCursor } = await deliveryRepo.listByDestination(
        req.params.id as string,
        req.auth!.projectId,
        {
          cursor: req.query.cursor as string | undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        }
      );

      res.json({
        data: deliveries,
        next_cursor: nextCursor,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as deliveryRoutes };
