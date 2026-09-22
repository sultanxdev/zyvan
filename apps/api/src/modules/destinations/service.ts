// ─────────────────────────────────────────────────────────────
// Zyvan API — Destination Service
// Business logic for destination management scoped to organization.
// Handles SSRF validation, secret encryption, pause/resume.
// ─────────────────────────────────────────────────────────────

import { validateUrl, encrypt } from '@zyvan/crypto';
import { config } from '../../config';
import * as destRepo from './repository';
import type { Destination } from '@zyvan/db';

export interface SafeDestination {
  id: string;
  organizationId: string;
  projectId: string;
  url: string;
  secretConfigured: boolean;
  retryPolicy: any;
  rateLimit: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  project?: { id: string; name: string };
}

function toSafeDestination(dest: Destination & { project?: { id: string; name: string } }): SafeDestination {
  return {
    id: dest.id,
    organizationId: dest.organizationId,
    projectId: dest.projectId,
    url: dest.url,
    secretConfigured: !!dest.secretRef,
    retryPolicy: dest.retryPolicy,
    rateLimit: dest.rateLimit,
    active: dest.active,
    createdAt: dest.createdAt,
    updatedAt: dest.updatedAt,
    ...(dest.project ? { project: dest.project } : {}),
  };
}

/**
 * Create a new destination within an organization.
 */
export async function createDestination(
  organizationId: string,
  projectId: string,
  url: string,
  secret?: string,
  retryPolicy?: { maxAttempts?: number; baseDelay?: number; maxDelay?: number },
  rateLimit?: number
): Promise<SafeDestination> {
  // 1. SSRF check
  const ssrfCheck = await validateUrl(url);
  if (!ssrfCheck.safe) {
    const err = new Error(`SSRF blocked: ${ssrfCheck.reason}`);
    (err as any).code = 'invalid_request';
    throw err;
  }

  // 2. Encrypt signing secret if provided
  let secretRef: string | null = null;
  if (secret) {
    const encKey = config.encryptionKey || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
    secretRef = encrypt(secret, encKey);
  }

  // 3. Persist destination
  const destination = await destRepo.create({
    organizationId,
    projectId,
    url,
    secretRef,
    retryPolicy,
    rateLimit,
  });

  return toSafeDestination(destination);
}

/**
 * List all destinations for an organization.
 */
export async function listDestinations(organizationId: string, projectId?: string): Promise<SafeDestination[]> {
  const destinations = await destRepo.listByOrganization(organizationId, projectId);
  return destinations.map(toSafeDestination);
}

/**
 * Get a destination by ID with tenant isolation.
 */
export async function getDestination(id: string, organizationId: string): Promise<SafeDestination | null> {
  const destination = await destRepo.findById(id, organizationId);
  return destination ? toSafeDestination(destination) : null;
}

/**
 * Update a destination.
 */
export async function updateDestination(
  id: string,
  organizationId: string,
  data: {
    url?: string;
    secret?: string;
    retryPolicy?: any;
    rateLimit?: number;
  }
): Promise<SafeDestination | null> {
  if (data.url) {
    const ssrfCheck = await validateUrl(data.url);
    if (!ssrfCheck.safe) {
      const err = new Error(`SSRF blocked: ${ssrfCheck.reason}`);
      (err as any).code = 'invalid_request';
      throw err;
    }
  }

  let secretRef: string | undefined = undefined;
  if (data.secret) {
    const encKey = config.encryptionKey || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
    secretRef = encrypt(data.secret, encKey);
  }

  const updated = await destRepo.update(id, organizationId, {
    url: data.url,
    secretRef,
    retryPolicy: data.retryPolicy,
    rateLimit: data.rateLimit,
  });

  return updated ? toSafeDestination(updated) : null;
}

/**
 * Pause a destination (stops webhook delivery).
 */
export async function pauseDestination(id: string, organizationId: string): Promise<SafeDestination | null> {
  const updated = await destRepo.setActive(id, organizationId, false);
  return updated ? toSafeDestination(updated) : null;
}

/**
 * Resume a destination.
 */
export async function resumeDestination(id: string, organizationId: string): Promise<SafeDestination | null> {
  const updated = await destRepo.setActive(id, organizationId, true);
  return updated ? toSafeDestination(updated) : null;
}

/**
 * Delete a destination.
 */
export async function deleteDestination(id: string, organizationId: string): Promise<boolean> {
  const result = await destRepo.remove(id, organizationId);
  return !!result;
}
