// ─────────────────────────────────────────────────────────────
// Zyvan API — Destination Repository
// Data access layer for the destinations table.
// Destinations define where Zyvan sends webhooks.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Destination } from '@zyvan/database';

export interface CreateDestinationData {
  tenantId: string;
  url: string;
  secretRef?: string | null;
  retryPolicy?: any;
  rateLimit?: number;
}

export interface UpdateDestinationData {
  url?: string;
  secretRef?: string | null;
  retryPolicy?: any;
  rateLimit?: number;
}

/**
 * Create a new destination.
 */
export async function create(data: CreateDestinationData): Promise<Destination> {
  const prisma = getPrismaClient();
  return prisma.destination.create({
    data: {
      tenantId: data.tenantId,
      url: data.url,
      secretRef: data.secretRef || null,
      retryPolicy: data.retryPolicy || {},
      rateLimit: data.rateLimit ?? 20,
    },
  });
}

/**
 * Find a destination by ID.
 */
export async function findById(id: string): Promise<Destination | null> {
  const prisma = getPrismaClient();
  return prisma.destination.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, projectId: true } },
    },
  });
}

/**
 * Find a destination by ID with project ownership check.
 * Returns null if the destination doesn't belong to the project.
 */
export async function findByIdWithProject(
  id: string,
  projectId: string
): Promise<(Destination & { tenant: { id: string; projectId: string } }) | null> {
  const prisma = getPrismaClient();
  return prisma.destination.findFirst({
    where: {
      id,
      tenant: { projectId },
    },
    include: {
      tenant: { select: { id: true, projectId: true } },
    },
  });
}

/**
 * List all destinations for a tenant.
 */
export async function listByTenant(tenantId: string): Promise<Destination[]> {
  const prisma = getPrismaClient();
  return prisma.destination.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * List all destinations for a project (across all tenants).
 */
export async function listByProject(projectId: string): Promise<Destination[]> {
  const prisma = getPrismaClient();
  return prisma.destination.findMany({
    where: {
      tenant: { projectId },
    },
    include: {
      tenant: { select: { id: true, name: true, externalId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a destination.
 */
export async function update(id: string, data: UpdateDestinationData): Promise<Destination> {
  const prisma = getPrismaClient();
  return prisma.destination.update({
    where: { id },
    data,
  });
}

/**
 * Set the active status of a destination (pause/resume).
 */
export async function setActive(id: string, active: boolean): Promise<Destination> {
  const prisma = getPrismaClient();
  return prisma.destination.update({
    where: { id },
    data: { active },
  });
}
