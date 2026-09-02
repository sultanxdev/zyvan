// ─────────────────────────────────────────────────────────────
// Zyvan API — Replay Routes
// POST /v1/events/:id/replay — Replay an event
//
// Mounted at /v1/events in app.ts, so paths here are
// relative to that prefix.
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.post('/:id/replay', authorize('events:write'), controller.replayEvent);

export { router as replayRoutes };
