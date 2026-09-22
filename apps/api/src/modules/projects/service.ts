// ─────────────────────────────────────────────────────────────
// Zyvan API — Project Service
// Business logic for project management scoped to Organization.
// ─────────────────────────────────────────────────────────────

import * as projectRepo from './repository';
import type { Project, ProjectStatus } from '@zyvan/db';

/**
 * Create a new project within an organization.
 */
export async function createProject(
  organizationId: string,
  name: string,
  plan?: string,
  description?: string
): Promise<Project> {
  return projectRepo.create({ organizationId, name, plan, description });
}

/**
 * Get a project by ID with organization boundary enforcement.
 */
export async function getProject(id: string, organizationId: string): Promise<Project | null> {
  return projectRepo.findById(id, organizationId);
}

/**
 * List all projects belonging to the caller's active organization.
 */
export async function listProjects(organizationId: string): Promise<Project[]> {
  return projectRepo.listByOrganization(organizationId);
}

/**
 * Update a project ensuring tenant boundary.
 */
export async function updateProject(
  id: string,
  organizationId: string,
  data: { name?: string; description?: string; status?: ProjectStatus }
): Promise<Project | null> {
  return projectRepo.update(id, organizationId, data);
}
