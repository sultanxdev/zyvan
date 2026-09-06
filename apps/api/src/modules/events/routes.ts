// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Routes
// POST   /v1/events       — Ingest event (202 Accepted)
// GET    /v1/events       — List events with filters
// GET    /v1/events/:id   — Event detail with delivery timeline
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.post('/', authorize('events:write'), controller.createEvent);
router.get('/', authorize('events:read'), controller.listEvents);
router.get('/:id', authorize('events:read'), controller.getEvent);

export { router as eventRoutes };
