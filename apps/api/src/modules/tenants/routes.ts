// ─────────────────────────────────────────────────────────────
// Zyvan API — Tenant Routes
// POST   /v1/tenants      — Create a tenant
// GET    /v1/tenants      — List tenants
// GET    /v1/tenants/:id  — Get tenant details
// PATCH  /v1/tenants/:id  — Update a tenant
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.post('/', authorize('tenants:manage'), controller.createTenant);
router.get('/', authorize('tenants:manage'), controller.listTenants);
router.get('/:id', authorize('tenants:manage'), controller.getTenant);
router.patch('/:id', authorize('tenants:manage'), controller.updateTenant);

export { router as tenantRoutes };
