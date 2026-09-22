// ─────────────────────────────────────────────────────────────
// Zyvan API — Usage Controller
// HTTP request handling for organization usage metrics.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import * as usageService from './service';

/**
 * GET /v1/usage
 * Get aggregated usage metrics for the caller's organization.
 */
export async function getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const projectId = (req.query.projectId as string) || (req.auth as any).projectId;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const usage = await usageService.getOrganizationUsage(orgId, projectId, {
      from,
      to,
    });

    res.json({ data: usage });
  } catch (err) {
    next(err);
  }
}
