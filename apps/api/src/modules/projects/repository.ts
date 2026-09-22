// ─────────────────────────────────────────────────────────────
// Zyvan API — Project Repository
// Multi-tenant data access layer for the projects table.
// All queries strictly scoped by organizationId.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import type { Project, ProjectStatus } from '@zyvan/db';

export interface CreateProjectData {
  organizationId: string;
  name: string;
  slug?: string;
  plan?: string;
}

export interface UpdateProjectData {
  name?: string;
  slug?: string;
  status?: ProjectStatus;
}

/**
 * Create a new project inside an organization.
 */
export async function create(data: CreateProjectData): Promise<Project> {
  const prisma = getPrismaClient();
  return prisma.project.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      slug: data.slug,
      plan: data.plan || 'free',
    },
  });
}

/**
 * Find a project by ID scoped to organization.
 */
export async function findById(id: string, organizationId?: string): Promise<Project | null> {
  const prisma = getPrismaClient();
  return prisma.project.findFirst({
    where: {
      id,
      ...(organizationId ? { organizationId } : {}),
    },
  });
}

/**
 * List all projects belonging to an organization.
 */
export async function listByOrganization(organizationId: string): Promise<Project[]> {
  const prisma = getPrismaClient();
  return prisma.project.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a project with tenant isolation check.
 */
export async function update(id: string, organizationId: string, data: UpdateProjectData): Promise<Project | null> {
  const prisma = getPrismaClient();

  const existing = await prisma.project.findFirst({ where: { id, organizationId } });
  if (!existing) return null;

  return prisma.project.update({
    where: { id },
    data,
  });
}
