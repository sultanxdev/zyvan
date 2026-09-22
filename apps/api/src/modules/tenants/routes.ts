// ─────────────────────────────────────────────────────────────
// Zyvan API — Tenant (Organization) Routes
// Backwards-compatible alias for /v1/organizations.
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as orgController from '../organizations/controller';

const router = Router();

router.post('/', authorize('organizations:create'), orgController.createOrganization);
router.get('/', authorize('organizations:read'), orgController.listUserOrganizations);
router.get('/:id', authorize('organizations:read'), orgController.getOrganization);

export { router as tenantRoutes };
