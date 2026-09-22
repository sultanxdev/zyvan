// ─────────────────────────────────────────────────────────────
// Zyvan API — Organization & Multi-Tenant Routes
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { requireSession, requirePermission } from '../../auth/guards';
import * as controller from './controller';

const router = Router();

// User's organizations (accessible to any session)
router.get('/', requireSession, controller.listUserOrganizations);
router.post('/', requireSession, controller.createOrganization);

// Current/specified organization details
router.get('/:id', requireSession, requirePermission('organizations', 'read'), controller.getOrganization);

// Organization membership & role management (RBAC enforced)
router.get('/:id/members', requireSession, requirePermission('organizations', 'read'), controller.listMembers);
router.post('/:id/invitations', requireSession, requirePermission('members', 'create'), controller.inviteMember);
router.patch('/:id/members/:memberId', requireSession, requirePermission('members', 'update'), controller.updateMemberRole);
router.delete('/:id/members/:memberId', requireSession, requirePermission('members', 'delete'), controller.removeMember);

export { router as organizationRoutes };
