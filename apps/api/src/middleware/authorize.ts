// ─────────────────────────────────────────────────────────────
// Zyvan API — Authorize Middleware
// Factory function that creates scope-checking middleware.
// Must run AFTER authenticate middleware (req.auth must exist).
//
// Usage: router.post('/events', authorize('events:write'), controller)
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';

/**
 * Create a middleware that checks if the authenticated API key
 * has ALL of the required scopes.
 *
 * @param requiredScopes - One or more scope strings the key must have
 * @returns Express middleware
 */
export function authorize(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        code: 'authentication_failed',
        message: 'Authentication required',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    // Dashboard user sessions have full access to manage their projects
    if (req.auth.type === 'user' || req.auth.scopes.includes('*')) {
      next();
      return;
    }

    const missingScopes = requiredScopes.filter(
      (scope) => !req.auth!.scopes.includes(scope)
    );

    if (missingScopes.length > 0) {
      res.status(403).json({
        code: 'authorization_denied',
        message: 'Insufficient permissions',
        request_id: req.requestId || 'unknown',
        details: { required: requiredScopes, missing: missingScopes },
      });
      return;
    }

    next();
  };
}
