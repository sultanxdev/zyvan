// ─────────────────────────────────────────────────────────────
// Zyvan API — Destination Routes
// POST   /v1/destinations             — Create a destination
// GET    /v1/destinations             — List destinations
// GET    /v1/destinations/:id         — Get destination details
// PATCH  /v1/destinations/:id         — Update a destination
// POST   /v1/destinations/:id/pause   — Pause delivery
// POST   /v1/destinations/:id/resume  — Resume delivery
// POST   /v1/destinations/:id/test    — Send test payload
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.post('/', authorize('destinations:manage'), controller.createDestination);
router.get('/', authorize('destinations:manage'), controller.listDestinations);
router.get('/:id', authorize('destinations:manage'), controller.getDestination);
router.patch('/:id', authorize('destinations:manage'), controller.updateDestination);

router.post('/:id/pause', authorize('destinations:manage'), controller.pauseDestination);
router.post('/:id/resume', authorize('destinations:manage'), controller.resumeDestination);
router.post('/:id/test', authorize('destinations:manage'), controller.testDestination);

export { router as destinationRoutes };
