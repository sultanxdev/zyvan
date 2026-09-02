// ─────────────────────────────────────────────────────────────
// Zyvan API — Usage Routes
// GET /v1/usage — Project usage metrics
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.get('/', authorize('usage:read'), controller.getUsage);

export { router as usageRoutes };
