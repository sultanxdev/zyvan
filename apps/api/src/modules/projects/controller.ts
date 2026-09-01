// ─────────────────────────────────────────────────────────────
// Zyvan API — Project Controller
// HTTP request parsing, validation, and response formatting
// for project management endpoints.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateProjectSchema, UpdateProjectSchema } from '@zyvan/schemas';
import * as projectService from './service';

/**
 * POST /v1/projects
 * Create a new project.
 */
export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateProjectSchema.parse(req.body);
    const project = await projectService.createProject(parsed.name, parsed.plan);

    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/projects
 * List projects accessible to the authenticated key.
 */
export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projects = await projectService.listProjects(req.auth!.projectId);
    res.json({ data: projects });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/projects/:id
 * Get a single project by ID.
 */
export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await projectService.getProject(req.params.id, req.auth!.projectId);

    if (!project) {
      res.status(404).json({
        code: 'not_found',
        message: 'Project not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /v1/projects/:id
 * Update a project.
 */
export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = UpdateProjectSchema.parse(req.body);
    const project = await projectService.updateProject(req.params.id, req.auth!.projectId, parsed);

    if (!project) {
      res.status(404).json({
        code: 'not_found',
        message: 'Project not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: project });
  } catch (err) {
    next(err);
  }
}
