// ─────────────────────────────────────────────────────────────
// Zyvan API — Project Routes
// POST   /v1/projects      — Create a project
// GET    /v1/projects      — List projects
// GET    /v1/projects/:id  — Get project details
// PATCH  /v1/projects/:id  — Update a project
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import * as controller from './controller';

const router = Router();

router.post('/', authorize('projects:manage'), controller.createProject);
router.get('/', authorize('projects:read'), controller.listProjects);
router.get('/:id', authorize('projects:read'), controller.getProject);
router.patch('/:id', authorize('projects:manage'), controller.updateProject);

export { router as projectRoutes };
