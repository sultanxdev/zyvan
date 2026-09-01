// ─────────────────────────────────────────────────────────────
// Zyvan API — Auth Service
// Validates bearer API keys against the database.
// Key flow: extract token → hash with pepper → DB lookup
//           → check active/expired/revoked → return AuthContext
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import { hashApiKey } from '@zyvan/crypto';
import { config } from '../../config';
import type { AuthContext } from './types';

export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: string;
  errorCode?: 'authentication_failed' | 'authorization_denied';
}

/**
 * Authenticate a bearer API key.
 *
 * 1. Hash the key with the application pepper
 * 2. Look up the hash in api_keys table
 * 3. Verify the key is active, not expired, not revoked
 * 4. Return the auth context (projectId, scopes, etc.)
 */
export async function authenticateByApiKey(bearerToken: string): Promise<AuthResult> {
  if (!bearerToken) {
    return {
      success: false,
      error: 'API key is required',
      errorCode: 'authentication_failed',
    };
  }

  const keyHash = hashApiKey(bearerToken, config.apiKeyPepper);
  const prisma = getPrismaClient();

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      project: { select: { id: true, status: true } },
    },
  });

  if (!apiKey) {
    return {
      success: false,
      error: 'Invalid API key',
      errorCode: 'authentication_failed',
    };
  }

  // Check if the key has been revoked
  if (apiKey.revokedAt) {
    return {
      success: false,
      error: 'API key has been revoked',
      errorCode: 'authentication_failed',
    };
  }

  // Check if the key has expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
      errorCode: 'authentication_failed',
    };
  }

  // Check if the parent project is active
  if (apiKey.project.status !== 'active') {
    return {
      success: false,
      error: 'Project is disabled',
      errorCode: 'authorization_denied',
    };
  }

  return {
    success: true,
    context: {
      projectId: apiKey.projectId,
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes,
    },
  };
}
