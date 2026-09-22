// ─────────────────────────────────────────────────────────────
// Zyvan API — Authorize Middleware
// Bridges legacy scope checks with modern Organization RBAC.
// Must run AFTER authenticate / requireAuth middleware.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '@zyvan/auth';
import type { Resource, Action } from '@zyvan/types';

function mapScopeToPermission(scope: string): { resource: Resource; action: Action } {
  const parts = scope.split(':');
  const res = parts[0];
  const act = parts[1] || 'read';

  let resource: Resource = 'projects';
  if (res === 'events') resource = 'events';
  else if (res === 'destinations') resource = 'destinations';
  else if (res === 'deliveries' || res === 'delivery') resource = 'deliveries';
  else if (res === 'api_keys' || res === 'api-keys') resource = 'api_keys';
  else if (res === 'replay') resource = 'replay';
  else if (res === 'tenants' || res === 'organizations') resource = 'organizations';
  else if (res === 'members') resource = 'members';
  else if (res === 'audit_logs') resource = 'audit_logs';

  let action: Action = 'read';
  if (act === 'write' || act === 'create' || act === 'trigger') action = 'create';
  else if (act === 'manage' || act === 'update') action = 'update';
  else if (act === 'delete' || act === 'remove') action = 'delete';

  return { resource, action };
}

/**
 * Create a middleware that checks if the caller has the required permissions/scopes.
 * Works seamlessly with both session auth (RBAC) and API key auth (scopes).
 */
export function authorize(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({
        code: 'authentication_failed',
        message: 'Authentication required',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    // 1. Session Auth (RBAC check)
    if (auth.type === 'session') {
      for (const scope of requiredScopes) {
        const { resource, action } = mapScopeToPermission(scope);
        if (!hasPermission(auth.role, resource, action)) {
          res.status(403).json({
            code: 'authorization_denied',
            message: `Role '${auth.role}' lacks permission for '${resource}:${action}'`,
            request_id: req.requestId || 'unknown',
            details: { required: requiredScopes, currentRole: auth.role },
          });
          return;
        }
      }
      next();
      return;
    }

    // 2. Machine API Key Auth (Scopes check)
    if (auth.type === 'api_key') {
      const keyScopes = auth.scopes || [];
      if (keyScopes.includes('*')) {
        next();
        return;
      }

      const missingScopes = requiredScopes.filter((reqScope) => {
        if (keyScopes.includes(reqScope)) return false;
        const [res] = reqScope.split(':');
        if (keyScopes.includes(`${res}:*`)) return false;
        return true;
      });

      if (missingScopes.length > 0) {
        res.status(403).json({
          code: 'authorization_denied',
          message: 'API key lacks required scopes',
          request_id: req.requestId || 'unknown',
          details: { required: requiredScopes, missing: missingScopes },
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
