// ─────────────────────────────────────────────────────────────
// Zyvan API — Project Repository
// Data access layer for the projects table.
// Project is the primary isolation boundary in Zyvan.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Project, ProjectStatus } from '@zyvan/database';

export interface CreateProjectData {
  name: string;
  plan?: string;
}

export interface UpdateProjectData {
  name?: string;
  status?: ProjectStatus;
}

/**
 * Create a new project.
 */
export async function create(data: CreateProjectData): Promise<Project> {
  const prisma = getPrismaClient();
  return prisma.project.create({
    data: {
      name: data.name,
      plan: data.plan || 'free',
    },
  });
}

/**
 * Find a project by its ID.
 */
export async function findById(id: string): Promise<Project | null> {
  const prisma = getPrismaClient();
  return prisma.project.findUnique({
    where: { id },
  });
}

/**
 * List all projects.
 * In a multi-user system this would be scoped to the user,
 * but for MVP v0.1 we list all.
 */
export async function listAll(): Promise<Project[]> {
  const prisma = getPrismaClient();
  return prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a project's mutable fields.
 */
export async function update(id: string, data: UpdateProjectData): Promise<Project | null> {
  const prisma = getPrismaClient();

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.project.update({
    where: { id },
    data,
  });
}
