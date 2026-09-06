// ─────────────────────────────────────────────────────────────
// Zyvan API — Project Service
// Business logic for project management.
// Projects are the primary isolation boundary.
// ─────────────────────────────────────────────────────────────

import * as projectRepo from './repository';
import type { Project } from '@zyvan/database';

/**
 * Create a new project.
 */
export async function createProject(name: string, plan?: string): Promise<Project> {
  return projectRepo.create({ name, plan });
}

/**
 * Get a project by ID. Enforces that the caller's API key
 * belongs to this project.
 */
export async function getProject(id: string, callerProjectId: string): Promise<Project | null> {
  // Enforce project isolation — a key can only view its own project
  if (id !== callerProjectId) {
    return null;
  }

  return projectRepo.findById(id);
}

/**
 * List projects accessible to the caller.
 * For MVP, a key can only see its own project.
 */
export async function listProjects(callerProjectId: string): Promise<Project[]> {
  const project = await projectRepo.findById(callerProjectId);
  return project ? [project] : [];
}

/**
 * Update a project. Enforces ownership.
 */
export async function updateProject(
  id: string,
  callerProjectId: string,
  data: { name?: string; status?: 'active' | 'disabled' }
): Promise<Project | null> {
  // Enforce project isolation
  if (id !== callerProjectId) {
    return null;
  }

  return projectRepo.update(id, data);
}
