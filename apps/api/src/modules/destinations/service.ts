// ─────────────────────────────────────────────────────────────
// Zyvan API — Destination Service
// Business logic for destination management.
// Handles SSRF validation, secret encryption, pause/resume.
// ─────────────────────────────────────────────────────────────

import { validateUrl, encrypt } from '@zyvan/crypto';
import { config } from '../../config';
import * as destRepo from './repository';
import * as tenantRepo from '../tenants/repository';

/** Destination representation safe for API responses (secret masked) */
export interface SafeDestination {
  id: string;
  tenantId: string;
  url: string;
  secretConfigured: boolean;
  retryPolicy: any;
  rateLimit: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenant?: { id: string; name: string; externalId: string };
}

/**
 * Strip the encrypted secret from the response.
 * Consumers only need to know IF a secret is configured.
 */
function toSafeDestination(dest: any): SafeDestination {
  return {
    id: dest.id,
    tenantId: dest.tenantId,
    url: dest.url,
    secretConfigured: !!dest.secretRef,
    retryPolicy: dest.retryPolicy,
    rateLimit: dest.rateLimit,
    active: dest.active,
    createdAt: dest.createdAt,
    updatedAt: dest.updatedAt,
    ...(dest.tenant ? { tenant: dest.tenant } : {}),
  };
}

/**
 * Create a new destination.
 *
 * 1. Verify the tenant belongs to the caller's project
 * 2. Validate URL for SSRF safety
 * 3. Encrypt the signing secret (if provided)
 * 4. Persist the destination
 */
export async function createDestination(
  projectId: string,
  tenantId: string | undefined,
  url: string,
  secret?: string,
  retryPolicy?: { maxAttempts?: number; baseDelay?: number; maxDelay?: number },
  rateLimit?: number
): Promise<SafeDestination> {
  // 1. Resolve tenant (auto-resolve default tenant if not provided)
  let resolvedTenantId = tenantId;
  if (!resolvedTenantId) {
    const defaultTenant = await tenantRepo.findByExternalId('tenant_default', projectId);
    if (defaultTenant) {
      resolvedTenantId = defaultTenant.id;
    } else {
      const allTenants = await tenantRepo.listByProject(projectId);
      if (allTenants.length > 0) {
        resolvedTenantId = allTenants[0].id;
      } else {
        const created = await tenantRepo.create({
          projectId,
          externalId: 'tenant_default',
          name: 'Default Tenant',
          concurrencyLimit: 10,
          rateLimit: 100,
        });
        resolvedTenantId = created.id;
      }
    }
  }

  // Verify tenant ownership
  const tenant = await tenantRepo.findById(resolvedTenantId, projectId);
  if (!tenant) {
    const err = new Error('Tenant not found or does not belong to this project');
    (err as any).code = 'not_found';
    (err as any).statusCode = 404;
    throw err;
  }

  // 2. SSRF validation
  const ssrfResult = await validateUrl(url);
  if (!ssrfResult.safe) {
    const err = new Error(`Destination URL is not safe: ${ssrfResult.reason}`);
    (err as any).code = 'invalid_request';
    (err as any).statusCode = 400;
    throw err;
  }

  // 3. Encrypt the signing secret
  let encryptedSecret: string | null = null;
  if (secret) {
    encryptedSecret = encrypt(secret, config.encryptionKey);
  }

  // 4. Create destination
  const destination = await destRepo.create({
    tenantId: resolvedTenantId,
    url,
    secretRef: encryptedSecret,
    retryPolicy: retryPolicy || { maxAttempts: 5, baseDelay: 1, maxDelay: 3600 },
    rateLimit,
  });

  return toSafeDestination(destination);
}

/**
 * Get a destination by ID. Enforces project ownership.
 * Secret is never exposed.
 */
export async function getDestination(id: string, projectId: string): Promise<SafeDestination | null> {
  const dest = await destRepo.findByIdWithProject(id, projectId);
  return dest ? toSafeDestination(dest) : null;
}

/**
 * List all destinations for the caller's project.
 */
export async function listDestinations(projectId: string): Promise<SafeDestination[]> {
  const dests = await destRepo.listByProject(projectId);
  return dests.map(toSafeDestination);
}

/**
 * Update a destination. Re-validates URL and re-encrypts secret if changed.
 */
export async function updateDestination(
  id: string,
  projectId: string,
  data: { url?: string; secret?: string; retryPolicy?: any; rateLimit?: number }
): Promise<SafeDestination | null> {
  // Verify ownership
  const existing = await destRepo.findByIdWithProject(id, projectId);
  if (!existing) return null;

  const updateData: any = {};

  // Re-validate URL if it's changing
  if (data.url) {
    const ssrfResult = await validateUrl(data.url);
    if (!ssrfResult.safe) {
      const err = new Error(`Destination URL is not safe: ${ssrfResult.reason}`);
      (err as any).code = 'invalid_request';
      (err as any).statusCode = 400;
      throw err;
    }
    updateData.url = data.url;
  }

  // Re-encrypt secret if changing
  if (data.secret) {
    updateData.secretRef = encrypt(data.secret, config.encryptionKey);
  }

  if (data.retryPolicy) updateData.retryPolicy = data.retryPolicy;
  if (data.rateLimit !== undefined) updateData.rateLimit = data.rateLimit;

  const updated = await destRepo.update(id, updateData);
  return toSafeDestination(updated);
}

/**
 * Pause a destination. Queued work remains — workers skip delivery.
 */
export async function pauseDestination(id: string, projectId: string): Promise<SafeDestination | null> {
  const existing = await destRepo.findByIdWithProject(id, projectId);
  if (!existing) return null;

  const updated = await destRepo.setActive(id, false);
  return toSafeDestination(updated);
}

/**
 * Resume a paused destination. Delivery resumes from queue.
 */
export async function resumeDestination(id: string, projectId: string): Promise<SafeDestination | null> {
  const existing = await destRepo.findByIdWithProject(id, projectId);
  if (!existing) return null;

  const updated = await destRepo.setActive(id, true);
  return toSafeDestination(updated);
}

/**
 * Test a destination by sending a lightweight test payload.
 * Does not create a real event or delivery record.
 */
export async function testDestination(
  id: string,
  projectId: string
): Promise<{ success: boolean; statusCode?: number; latencyMs?: number; error?: string }> {
  const dest = await destRepo.findByIdWithProject(id, projectId);
  if (!dest) {
    const err = new Error('Destination not found');
    (err as any).code = 'not_found';
    (err as any).statusCode = 404;
    throw err;
  }

  const testPayload = JSON.stringify({
    type: 'destination.test',
    data: { message: 'Zyvan test delivery' },
    timestamp: new Date().toISOString(),
  });

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(dest.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Zyvan/0.1.0',
        'X-Zyvan-Test': 'true',
      },
      body: testPayload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    return {
      success: response.ok,
      statusCode: response.status,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      error: err.name === 'AbortError' ? 'Connection timed out (10s)' : err.message,
    };
  }
}

/**
 * Delete a destination by ID.
 */
export async function deleteDestination(id: string, projectId: string): Promise<boolean> {
  const existing = await destRepo.findByIdWithProject(id, projectId);
  if (!existing) return false;

  await destRepo.remove(id);
  return true;
}
