// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Routes
// GET /v1/dead-letters      — List dead-lettered deliveries
// GET /v1/dead-letters/:id  — Inspect dead-letter detail & attempts
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.get('/', authorize('events:read'), controller.listDeadLetters);
router.get('/:id', authorize('events:read'), controller.getDeadLetter);

export { router as dlqRoutes };
