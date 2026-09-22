// ─────────────────────────────────────────────────────────────
// Zyvan API — Authentication & Authorization Guards
// Enforces tenant isolation, Better Auth sessions, API key
// verification, and organization-scoped RBAC permissions.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, getOrganizationMembership, hasPermission, getRolePermissions } from '@zyvan/auth';
import { getPrismaClient } from '@zyvan/db';
import { hashApiKey } from '@zyvan/crypto';
import { config } from '../config';
import { logger } from '../lib/logger';
import type { Resource, Action, Role } from '@zyvan/types';
import './types';

/**
 * Validates a machine API key (zyvan_live_... / zyvan_test_...)
 */
export async function authenticateApiKey(
  rawKey: string,
  req: Request
): Promise<boolean> {
  const prisma = getPrismaClient();
  const pepper = config.apiKeyPepper || process.env.API_KEY_PEPPER || 'zyvan_dev_pepper';
  const keyHash = hashApiKey(rawKey, pepper);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      organization: true,
      project: true,
    },
  });

  if (!apiKey) {
    return false;
  }

  // Check revocation
  if (apiKey.revokedAt) {
    return false;
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return false;
  }

  // Update lastUsedAt asynchronously without blocking request
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => {
      logger.error({ err, apiKeyId: apiKey.id }, 'Failed to update apiKey lastUsedAt');
    });

  req.organization = apiKey.organization;
  req.auth = {
    type: 'api_key',
    apiKeyId: apiKey.id,
    organizationId: apiKey.organizationId,
    projectId: apiKey.projectId,
    scopes: apiKey.scopes,
    keyPrefix: apiKey.keyPrefix,
  };

  return true;
}

/**
 * Validates an interactive Better Auth session and ensures active organization membership.
 */
export async function authenticateSession(req: Request): Promise<boolean> {
  try {
    const headers = fromNodeHeaders(req.headers);
    const sessionData = await auth.api.getSession({
      headers,
    });

    if (!sessionData?.session || !sessionData?.user) {
      return false;
    }

    const prisma = getPrismaClient();
    const userId = sessionData.user.id;

    // Determine target organization:
    // 1. Explicit header 'X-Organization-Id'
    // 2. Active organization in session
    // 3. User's primary/first organization membership
    let targetOrgId =
      (req.headers['x-organization-id'] as string) ||
      sessionData.session.activeOrganizationId ||
      null;

    if (!targetOrgId) {
      const firstMembership = await prisma.member.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (firstMembership) {
        targetOrgId = firstMembership.organizationId;
      }
    }

    if (!targetOrgId) {
      // User is authenticated but does not belong to any organization yet
      return false;
    }

    // Verify tenant membership & get role
    const membership = await getOrganizationMembership(targetOrgId, userId);
    if (!membership) {
      return false;
    }

    const role = (membership.role.toLowerCase() as Role) || 'member';
    const permissions = getRolePermissions(role);

    req.currentUser = sessionData.user as any;
    req.organization = membership.organization as any;
    req.membership = membership as any;
    req.auth = {
      type: 'session',
      userId,
      userEmail: sessionData.user.email,
      userName: sessionData.user.name,
      organizationId: membership.organizationId,
      role,
      permissions,
    };

    return true;
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Session authentication error');
    return false;
  }
}

/**
 * Middleware: Requires either a valid Bearer API key or a valid Better Auth session.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // 1. Check if Bearer token is provided
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token.startsWith('zyvan_')) {
      const validApiKey = await authenticateApiKey(token, req);
      if (validApiKey) {
        next();
        return;
      }
      res.status(401).json({
        code: 'authentication_failed',
        message: 'Invalid, expired, or revoked API key',
        request_id: req.requestId || 'unknown',
      });
      return;
    }
  }

  // 2. Check session cookies / headers
  const validSession = await authenticateSession(req);
  if (validSession) {
    next();
    return;
  }

  res.status(401).json({
    code: 'authentication_required',
    message: 'Authentication required. Please provide a valid API key or session.',
    request_id: req.requestId || 'unknown',
  });
}

/**
 * Middleware: Strictly requires a valid Better Auth session and active organization.
 */
export async function requireSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const validSession = await authenticateSession(req);
  if (!validSession) {
    res.status(401).json({
      code: 'authentication_required',
      message: 'Valid interactive session and active organization membership required.',
      request_id: req.requestId || 'unknown',
    });
    return;
  }
  next();
}

/**
 * Middleware: Strictly requires a valid machine API key.
 */
export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'authentication_failed',
      message: 'Authorization header with Bearer scheme is required',
      request_id: req.requestId || 'unknown',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const valid = await authenticateApiKey(token, req);
  if (!valid) {
    res.status(401).json({
      code: 'authentication_failed',
      message: 'Invalid, expired, or revoked API key',
      request_id: req.requestId || 'unknown',
    });
    return;
  }

  next();
}

/**
 * Middleware Factory: Enforces granular RBAC permissions.
 * Inspects req.auth (session role or API key scopes) to grant or deny access.
 */
export function requirePermission(resource: Resource, action: Action) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authCtx = req.auth;
    if (!authCtx) {
      res.status(401).json({
        code: 'authentication_required',
        message: 'Authentication context missing',
        request_id: req.requestId || 'unknown',
      });
      return;
    }

    if (authCtx.type === 'session') {
      const allowed = hasPermission(authCtx.role, resource, action);
      if (!allowed) {
        res.status(403).json({
          code: 'authorization_denied',
          message: `Role '${authCtx.role}' lacks permission to '${action}' on '${resource}'`,
          request_id: req.requestId || 'unknown',
          required: { resource, action },
        });
        return;
      }
      next();
      return;
    }

    if (authCtx.type === 'api_key') {
      // API key scope validation:
      // Accepts '*', '<resource>:*', or '<resource>:<action>'
      const scopes = authCtx.scopes || [];
      const isAllowed =
        scopes.includes('*') ||
        scopes.includes(`${resource}:*`) ||
        scopes.includes(`${resource}:${action}`) ||
        scopes.includes(action);

      if (!isAllowed) {
        res.status(403).json({
          code: 'authorization_denied',
          message: `API key lacks required scope for '${resource}:${action}'`,
          request_id: req.requestId || 'unknown',
          required: { resource, action },
        });
        return;
      }
      next();
      return;
    }

    res.status(403).json({
      code: 'authorization_denied',
      message: 'Unknown authentication type',
      request_id: req.requestId || 'unknown',
    });
  };
}

/**
 * Middleware Factory: Restricts access to specific roles (e.g. ['owner', 'admin'])
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authCtx = req.auth;
    if (!authCtx) {
      res.status(401).json({
        code: 'authentication_required',
        message: 'Authentication context missing',
        request_id: req.requestId || 'unknown',
      });
      return;
    }

    if (authCtx.type !== 'session') {
      res.status(403).json({
        code: 'authorization_denied',
        message: 'This operation requires an interactive user session with an authorized role',
        request_id: req.requestId || 'unknown',
      });
      return;
    }

    if (!allowedRoles.includes(authCtx.role)) {
      res.status(403).json({
        code: 'authorization_denied',
        message: `Action requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${authCtx.role}`,
        request_id: req.requestId || 'unknown',
      });
      return;
    }

    next();
  };
}
