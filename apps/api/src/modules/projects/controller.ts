// ─────────────────────────────────────────────────────────────
// Zyvan API — Project Controller
// Multi-tenant project endpoints scoped to organization.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateProjectSchema, UpdateProjectSchema } from '@zyvan/validation';
import * as projectService from './service';

/**
 * POST /v1/projects
 * Create a new project inside caller's organization.
 */
export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const parsed = CreateProjectSchema.parse(req.body);
    const project = await projectService.createProject(orgId, parsed.name, parsed.plan, (parsed as any).description);

    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/projects
 * List all projects for caller's organization.
 */
export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const projects = await projectService.listProjects(orgId);
    res.json({ data: projects });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/projects/:id
 * Get a single project by ID (scoped to organization).
 */
export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const project = await projectService.getProject(req.params.id as string, orgId);

    if (!project) {
      res.status(404).json({
        code: 'not_found',
        message: 'Project not found in this organization',
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
 * Update a project (scoped to organization).
 */
export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const parsed = UpdateProjectSchema.parse(req.body);
    const project = await projectService.updateProject(req.params.id as string, orgId, parsed);

    if (!project) {
      res.status(404).json({
        code: 'not_found',
        message: 'Project not found in this organization',
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
