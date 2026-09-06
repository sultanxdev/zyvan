// ─────────────────────────────────────────────────────────────
// Zyvan API — API Key Routes
// POST   /v1/api-keys      — Create a new API key
// GET    /v1/api-keys      — List API keys for the project
// DELETE /v1/api-keys/:id  — Revoke an API key
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.post('/', authorize('api-keys:manage'), controller.createApiKey);
router.get('/', authorize('api-keys:manage'), controller.listApiKeys);
router.delete('/:id', authorize('api-keys:manage'), controller.revokeApiKey);

export { router as apiKeyRoutes };
