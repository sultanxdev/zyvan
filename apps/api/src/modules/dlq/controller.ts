// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Controller
// HTTP request handling for inspecting dead letter deliveries
// and operational triage summaries.
// Scoped to organizationId.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { DLQFilterSchema, DLQSummaryFilterSchema, ReplayBulkSchema } from '@zyvan/validation';
import * as dlqService from './service';

/**
 * GET /v1/dead-letters
 * List dead-lettered deliveries for caller's organization.
 * Defaults to status=open for immediate actionable triage.
 */
export async function listDeadLetters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const projectId = (req.query.projectId as string) || (req.auth as any).projectId;

    const filters = DLQFilterSchema.parse({
      projectId,
      destinationId: req.query.destinationId,
      eventType: req.query.eventType,
      status: req.query.status,
      reason: req.query.reason,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });

    const result = await dlqService.listDeadLetters(orgId, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/dead-letters/summary
 * Aggregated metrics summary for dead letters across statuses, reasons, and top destinations.
 * Status is optional (no default) so it computes across all statuses by default.
 */
export async function getDLQSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const projectId = (req.query.projectId as string) || (req.auth as any).projectId;

    const filters = DLQSummaryFilterSchema.parse({
      projectId,
      destinationId: req.query.destinationId,
      eventType: req.query.eventType,
      status: req.query.status,
      reason: req.query.reason,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
    });

    const summary = await dlqService.getDLQSummary(orgId, filters);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/dead-letters/:id
 * Get detailed dead-letter entry with full attempt timeline and destination.
 */
export async function getDeadLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const deadLetter = await dlqService.getDeadLetter(req.params.id as string, orgId);

    if (!deadLetter) {
      res.status(404).json({
        code: 'not_found',
        message: 'Dead letter record not found in this organization',
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

/**
 * POST /v1/dead-letters/:id/replay
 * Replay a dead-lettered delivery.
 * Requires:
 * - 'Idempotency-Key' header (mandatory, returns 400 if missing)
 * - delivery:replay permission
 */
export async function replayDeadLetter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idempotencyKey = (req.headers['idempotency-key'] as string)?.trim();
    if (!idempotencyKey) {
      res.status(400).json({
        code: 'invalid_request',
        message: "Missing required 'Idempotency-Key' header",
        request_id: req.requestId || 'unknown',
        details: { header: 'Idempotency-Key' },
      });
      return;
    }

    const orgId = req.auth!.organizationId;
    const requestedBy = req.auth?.userId || req.auth?.keyId || 'api_key';

    const result = await dlqService.replayDeadLetter(
      req.params.id as string,
      orgId,
      idempotencyKey,
      requestedBy
    );

    res.status(result.status === 'existing' ? 200 : 202).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /v1/dead-letters/replay-bulk
 * Bulk replay eligible dead-lettered deliveries matching filter criteria.
 * Requires:
 * - 'Idempotency-Key' header (mandatory, returns 400 if missing)
 * - delivery:replay permission
 */
export async function replayBulk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idempotencyKey = (req.headers['idempotency-key'] as string)?.trim();
    if (!idempotencyKey) {
      res.status(400).json({
        code: 'invalid_request',
        message: "Missing required 'Idempotency-Key' header",
        request_id: req.requestId || 'unknown',
        details: { header: 'Idempotency-Key' },
      });
      return;
    }

    const orgId = req.auth!.organizationId;
    const requestedBy = req.auth?.userId || req.auth?.keyId || 'api_key';
    const input = ReplayBulkSchema.parse(req.body || {});

    const result = await dlqService.replayBulk(
      orgId,
      input,
      idempotencyKey,
      requestedBy
    );

    res.status(result.status === 'existing' ? 200 : 202).json({ data: result });
  } catch (err) {
    next(err);
  }
}
