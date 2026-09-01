// ─────────────────────────────────────────────────────────────
// Zyvan API — Tenant Service
// Business logic for tenant management.
// Tenants belong to a project and have their own concurrency
// and rate limits for noisy-neighbor protection.
// ─────────────────────────────────────────────────────────────

import * as tenantRepo from './repository';
import type { Tenant } from '@zyvan/database';

/**
 * Create a tenant within the caller's project.
 * Checks for duplicate external_id within the project.
 */
export async function createTenant(
  projectId: string,
  externalId: string,
  name: string,
  concurrencyLimit?: number,
  rateLimit?: number
): Promise<Tenant> {
  // Check for duplicate external_id in this project
  const existing = await tenantRepo.findByExternalId(externalId, projectId);
  if (existing) {
    const err = new Error(`Tenant with external_id '${externalId}' already exists in this project`);
    (err as any).code = 'conflict';
    (err as any).statusCode = 409;
    throw err;
  }

  return tenantRepo.create({
    projectId,
    externalId,
    name,
    concurrencyLimit,
    rateLimit,
  });
}

/**
 * Get a tenant by ID. Enforces project ownership.
 */
export async function getTenant(id: string, projectId: string): Promise<Tenant | null> {
  return tenantRepo.findById(id, projectId);
}

/**
 * List all tenants in the caller's project.
 */
export async function listTenants(projectId: string): Promise<Tenant[]> {
  return tenantRepo.listByProject(projectId);
}

/**
 * Update a tenant. Enforces project ownership.
 */
export async function updateTenant(
  id: string,
  projectId: string,
  data: { name?: string; concurrencyLimit?: number; rateLimit?: number; status?: 'active' | 'paused' | 'disabled' }
): Promise<Tenant | null> {
  return tenantRepo.update(id, projectId, data);
}
