// ─────────────────────────────────────────────────────────────
// Zyvan API — API Key Repository
// Multi-tenant data access layer for api_keys.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import type { ApiKey } from '@zyvan/db';

export interface CreateApiKeyData {
  organizationId: string;
  projectId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  expiresAt?: Date | null;
}

/**
 * Create a new API key record scoped to organization and project.
 */
export async function create(data: CreateApiKeyData): Promise<ApiKey> {
  const prisma = getPrismaClient();
  return prisma.apiKey.create({
    data: {
      organizationId: data.organizationId,
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
 */
export async function findByHash(keyHash: string): Promise<ApiKey | null> {
  const prisma = getPrismaClient();
  return prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      organization: true,
      project: true,
    },
  });
}

/**
 * Find an API key by ID scoped to organization.
 */
export async function findById(id: string, organizationId: string): Promise<ApiKey | null> {
  const prisma = getPrismaClient();
  return prisma.apiKey.findFirst({
    where: { id, organizationId },
  });
}

/**
 * List all API keys for an organization, optionally filtered by project.
 */
export async function listByOrganization(organizationId: string, projectId?: string): Promise<ApiKey[]> {
  const prisma = getPrismaClient();
  return prisma.apiKey.findMany({
    where: {
      organizationId,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke an API key scoped to organization.
 */
export async function revoke(id: string, organizationId: string): Promise<ApiKey | null> {
  const prisma = getPrismaClient();

  const key = await prisma.apiKey.findFirst({
    where: { id, organizationId },
  });

  if (!key) return null;

  return prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}
