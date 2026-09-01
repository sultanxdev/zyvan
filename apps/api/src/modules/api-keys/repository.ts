// ─────────────────────────────────────────────────────────────
// Zyvan API — API Key Repository
// Data access layer for the api_keys table.
// All database interactions for API keys go through here.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { ApiKey } from '@zyvan/database';

export interface CreateApiKeyData {
  projectId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  expiresAt?: Date | null;
}

/**
 * Create a new API key record.
 * The hash (not the raw key) is what gets stored.
 */
export async function create(data: CreateApiKeyData): Promise<ApiKey> {
  const prisma = getPrismaClient();
  return prisma.apiKey.create({
    data: {
      projectId: data.projectId,
      keyHash: data.keyHash,
      keyPrefix: data.keyPrefix,
      name: data.name,
      scopes: data.scopes,
      expiresAt: data.expiresAt || null,
    },
  });
}

/**
 * Find an API key by its hash.
 * Used during authentication — the bearer token is hashed and looked up.
 */
export async function findByHash(keyHash: string): Promise<ApiKey | null> {
  const prisma = getPrismaClient();
  return prisma.apiKey.findUnique({
    where: { keyHash },
  });
}

/**
 * Find an API key by ID (must also belong to the given project).
 */
export async function findById(id: string, projectId: string): Promise<ApiKey | null> {
  const prisma = getPrismaClient();
  return prisma.apiKey.findFirst({
    where: { id, projectId },
  });
}

/**
 * List all API keys for a project.
 * Returns keys ordered by creation date (newest first).
 */
export async function listByProject(projectId: string): Promise<ApiKey[]> {
  const prisma = getPrismaClient();
  return prisma.apiKey.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke an API key by setting revokedAt timestamp.
 * The key remains in the database for audit trail purposes.
 */
export async function revoke(id: string, projectId: string): Promise<ApiKey | null> {
  const prisma = getPrismaClient();

  // Ensure key belongs to this project
  const key = await prisma.apiKey.findFirst({
    where: { id, projectId },
  });

  if (!key) return null;

  return prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}
