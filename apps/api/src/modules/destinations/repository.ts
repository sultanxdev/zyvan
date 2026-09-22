// ─────────────────────────────────────────────────────────────
// Zyvan API — Destination Repository
// Multi-tenant data access layer for webhook destinations.
// All queries scoped by organizationId.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import type { Destination } from '@zyvan/db';

export interface CreateDestinationData {
  organizationId: string;
  projectId: string;
  name: string;
  url: string;
  secretRef?: string | null;
  retryPolicy?: any;
  rateLimit?: number;
  events?: string[];
}

export interface UpdateDestinationData {
  name?: string;
  url?: string;
  secretRef?: string | null;
  retryPolicy?: any;
  rateLimit?: number;
  events?: string[];
  active?: boolean;
}

/**
 * Create a new destination within an organization.
 */
export async function create(data: CreateDestinationData): Promise<Destination> {
  const prisma = getPrismaClient();
  return prisma.destination.create({
    data: {
      organizationId: data.organizationId,
      projectId: data.projectId,
      name: data.name,
      url: data.url,
      secretRef: data.secretRef || null,
      retryPolicy: data.retryPolicy || {},
      rateLimit: data.rateLimit ?? 20,
      events: data.events || ['*'],
      active: true,
    },
  });
}

/**
 * Find a destination by ID scoped to organization.
 */
export async function findById(id: string, organizationId: string): Promise<Destination | null> {
  const prisma = getPrismaClient();
  return prisma.destination.findFirst({
    where: { id, organizationId },
    include: {
      project: { select: { id: true, name: true } },
    },
  });
}

/**
 * List all destinations for an organization, optionally filtered by project.
 */
export async function listByOrganization(organizationId: string, projectId?: string): Promise<Destination[]> {
  const prisma = getPrismaClient();
  return prisma.destination.findMany({
    where: {
      organizationId,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a destination scoped to organization.
 */
export async function update(id: string, organizationId: string, data: UpdateDestinationData): Promise<Destination | null> {
  const prisma = getPrismaClient();
  const existing = await prisma.destination.findFirst({ where: { id, organizationId } });
  if (!existing) return null;

  return prisma.destination.update({
    where: { id },
    data,
  });
}

/**
 * Set active status (pause/resume) scoped to organization.
 */
export async function setActive(id: string, organizationId: string, active: boolean): Promise<Destination | null> {
  const prisma = getPrismaClient();
  const existing = await prisma.destination.findFirst({ where: { id, organizationId } });
  if (!existing) return null;

  return prisma.destination.update({
    where: { id },
    data: { active },
  });
}

/**
 * Delete a destination scoped to organization.
 */
export async function remove(id: string, organizationId: string): Promise<Destination | null> {
  const prisma = getPrismaClient();
  const existing = await prisma.destination.findFirst({ where: { id, organizationId } });
  if (!existing) return null;

  return prisma.destination.delete({
    where: { id },
  });
}
