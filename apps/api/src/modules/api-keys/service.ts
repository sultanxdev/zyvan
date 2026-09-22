// ─────────────────────────────────────────────────────────────
// Zyvan API — API Key Service
// Business logic for API key management scoped to organization.
// ─────────────────────────────────────────────────────────────

import { generateApiKey, hashApiKey } from '@zyvan/crypto';
import { config } from '../../config';
import * as apiKeyRepo from './repository';
import type { ApiKey } from '@zyvan/db';

export interface CreateApiKeyResult {
  /** The plaintext key — returned ONLY this one time */
  key: string;
  apiKey: SafeApiKey;
}

/** API key representation safe for API responses (no hash) */
export interface SafeApiKey {
  id: string;
  organizationId: string;
  projectId: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
}

/**
 * Strip sensitive fields from an API key record.
 */
function toSafeApiKey(apiKey: ApiKey): SafeApiKey {
  return {
    id: apiKey.id,
    organizationId: apiKey.organizationId,
    projectId: apiKey.projectId,
    keyPrefix: apiKey.keyPrefix,
    name: apiKey.name,
    scopes: apiKey.scopes,
    expiresAt: apiKey.expiresAt,
    revokedAt: apiKey.revokedAt,
    lastUsedAt: apiKey.lastUsedAt,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Create a new API key for a project within an organization.
 */
export async function createApiKey(
  organizationId: string,
  projectId: string,
  name: string,
  scopes: string[],
  expiresAt?: string
): Promise<CreateApiKeyResult> {
  const { key, prefix } = generateApiKey();
  const pepper = config.apiKeyPepper || process.env.API_KEY_PEPPER || 'zyvan_dev_pepper';
  const keyHash = hashApiKey(key, pepper);

  const apiKey = await apiKeyRepo.create({
    organizationId,
    projectId,
    keyHash,
    keyPrefix: prefix,
    name,
    scopes,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  return {
    key,
    apiKey: toSafeApiKey(apiKey),
  };
}

/**
 * List all API keys for an organization, optionally filtered by project.
 */
export async function listApiKeys(organizationId: string, projectId?: string): Promise<SafeApiKey[]> {
  const keys = await apiKeyRepo.listByOrganization(organizationId, projectId);
  return keys.map(toSafeApiKey);
}

/**
 * Revoke an API key with organization boundary enforcement.
 */
export async function revokeApiKey(id: string, organizationId: string): Promise<SafeApiKey | null> {
  const revoked = await apiKeyRepo.revoke(id, organizationId);
  return revoked ? toSafeApiKey(revoked) : null;
}
