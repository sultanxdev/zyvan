// ─────────────────────────────────────────────────────────────
// Zyvan API — API Key Service
// Business logic for API key management.
// The plaintext key is returned ONLY on creation — never again.
// ─────────────────────────────────────────────────────────────

import { generateApiKey, hashApiKey } from '@zyvan/crypto';
import { config } from '../../config';
import * as apiKeyRepo from './repository';
import type { ApiKey } from '@zyvan/database';

export interface CreateApiKeyResult {
  /** The plaintext key — returned ONLY this one time */
  key: string;
  apiKey: SafeApiKey;
}

/** API key representation safe for API responses (no hash) */
export interface SafeApiKey {
  id: string;
  projectId: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/**
 * Strip sensitive fields from an API key record.
 */
function toSafeApiKey(apiKey: ApiKey): SafeApiKey {
  return {
    id: apiKey.id,
    projectId: apiKey.projectId,
    keyPrefix: apiKey.keyPrefix,
    name: apiKey.name,
    scopes: apiKey.scopes,
    expiresAt: apiKey.expiresAt,
    revokedAt: apiKey.revokedAt,
    createdAt: apiKey.createdAt,
  };
}

/**
 * Create a new API key for a project.
 *
 * 1. Generate a random key with zyvan_live_ prefix
 * 2. Hash it with the application pepper
 * 3. Store the hash (never the raw key)
 * 4. Return the plaintext key exactly once
 */
export async function createApiKey(
  projectId: string,
  name: string,
  scopes: string[],
  expiresAt?: string
): Promise<CreateApiKeyResult> {
  const { key, prefix } = generateApiKey();
  const keyHash = hashApiKey(key, config.apiKeyPepper);

  const apiKey = await apiKeyRepo.create({
    projectId,
    keyHash,
    keyPrefix: prefix,
    name,
    scopes,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  return {
    key, // ← plaintext, returned this one time only
    apiKey: toSafeApiKey(apiKey),
  };
}

/**
 * List all API keys for a project (safe representation — no hashes).
 */
export async function listApiKeys(projectId: string): Promise<SafeApiKey[]> {
  const keys = await apiKeyRepo.listByProject(projectId);
  return keys.map(toSafeApiKey);
}

/**
 * Revoke an API key. The key remains in the database but will
 * be rejected during authentication.
 */
export async function revokeApiKey(id: string, projectId: string): Promise<SafeApiKey | null> {
  const revoked = await apiKeyRepo.revoke(id, projectId);
  return revoked ? toSafeApiKey(revoked) : null;
}
