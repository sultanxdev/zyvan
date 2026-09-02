// ─────────────────────────────────────────────────────────────
// Zyvan API — Usage Controller
// HTTP request handling for project usage metrics.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import * as usageService from './service';

/**
 * GET /v1/usage
 * Get aggregated usage metrics for the authenticated project.
 */
export async function getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const usage = await usageService.getProjectUsage(req.auth!.projectId, {
      from,
      to,
    });

    res.json({ data: usage });
  } catch (err) {
    next(err);
  }
}
