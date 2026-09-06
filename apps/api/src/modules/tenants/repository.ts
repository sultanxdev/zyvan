// ─────────────────────────────────────────────────────────────
// Zyvan API — Tenant Repository
// Data access layer for the tenants table.
// Tenants enable noisy-neighbor isolation within a project.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Tenant, TenantStatus } from '@zyvan/database';

export interface CreateTenantData {
  projectId: string;
  externalId: string;
  name: string;
  concurrencyLimit?: number;
  rateLimit?: number;
}

export interface UpdateTenantData {
  name?: string;
  concurrencyLimit?: number;
  rateLimit?: number;
  status?: TenantStatus;
}

/**
 * Create a new tenant within a project.
 */
export async function create(data: CreateTenantData): Promise<Tenant> {
  const prisma = getPrismaClient();
  return prisma.tenant.create({
    data: {
      projectId: data.projectId,
      externalId: data.externalId,
      name: data.name,
      concurrencyLimit: data.concurrencyLimit ?? 5,
      rateLimit: data.rateLimit ?? 100,
    },
  });
}

/**
 * Find a tenant by ID. Must belong to the given project.
 */
export async function findById(id: string, projectId: string): Promise<Tenant | null> {
  const prisma = getPrismaClient();
  return prisma.tenant.findFirst({
    where: { id, projectId },
  });
}

/**
 * Find a tenant by external ID within a project.
 */
export async function findByExternalId(externalId: string, projectId: string): Promise<Tenant | null> {
  const prisma = getPrismaClient();
  return prisma.tenant.findFirst({
    where: { externalId, projectId },
  });
}

/**
 * List all tenants for a project.
 */
export async function listByProject(projectId: string): Promise<Tenant[]> {
  const prisma = getPrismaClient();
  return prisma.tenant.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a tenant. Must belong to the given project.
 */
export async function update(
  id: string,
  projectId: string,
  data: UpdateTenantData
): Promise<Tenant | null> {
  const prisma = getPrismaClient();

  const existing = await prisma.tenant.findFirst({
    where: { id, projectId },
  });

  if (!existing) return null;

  return prisma.tenant.update({
    where: { id },
    data,
  });
}
