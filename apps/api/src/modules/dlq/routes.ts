// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Routes
// GET  /v1/dead-letters             — List dead-lettered deliveries (default status=open)
// GET  /v1/dead-letters/summary     — Aggregated triage metrics (no status default)
// POST /v1/dead-letters/replay-bulk — Bulk replay eligible open dead letters
// GET  /v1/dead-letters/:id         — Inspect dead-letter detail & attempts
// POST /v1/dead-letters/:id/replay  — Replay a single dead letter
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

// Order: Static routes before parameterized routes
router.get('/', authorize('delivery:read'), controller.listDeadLetters);
router.get('/summary', authorize('delivery:read'), controller.getDLQSummary);
router.post('/replay-bulk', authorize('delivery:replay'), controller.replayBulk);
router.post('/dismiss-bulk', authorize('delivery:manage'), controller.dismissBulk);
router.post('/resolve-bulk', authorize('delivery:manage'), controller.resolveBulk);

router.get('/:id', authorize('delivery:read'), controller.getDeadLetter);
router.post('/:id/replay', authorize('delivery:replay'), controller.replayDeadLetter);
router.post('/:id/dismiss', authorize('delivery:manage'), controller.dismissDeadLetter);
router.post('/:id/resolve', authorize('delivery:manage'), controller.resolveDeadLetter);

export { router as dlqRoutes };
