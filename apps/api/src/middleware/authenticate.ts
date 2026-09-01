// ─────────────────────────────────────────────────────────────
// Zyvan API — Authenticate Middleware
// Extracts Bearer API key from the Authorization header,
// validates it, and attaches AuthContext to the request.
//
// Flow: Authorization header → extract token → auth service
//       → attach req.auth or return 401
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { authenticateByApiKey } from '../modules/auth/service';
import { logger } from '../lib/logger';
import '../modules/auth/types'; // Ensure req.auth type is augmented

/**
 * Authentication middleware for API key-protected routes.
 * Expects: Authorization: Bearer <api_key>
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      code: 'authentication_failed',
      message: 'Missing Authorization header',
      request_id: req.requestId || 'unknown',
      details: {},
    });
    return;
  }

  // Must be Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'authentication_failed',
      message: 'Authorization header must use Bearer scheme',
      request_id: req.requestId || 'unknown',
      details: {},
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    res.status(401).json({
      code: 'authentication_failed',
      message: 'API key is required',
      request_id: req.requestId || 'unknown',
      details: {},
    });
    return;
  }

  try {
    const result = await authenticateByApiKey(token);

    if (!result.success || !result.context) {
      const statusCode = result.errorCode === 'authorization_denied' ? 403 : 401;
      res.status(statusCode).json({
        code: result.errorCode || 'authentication_failed',
        message: result.error || 'Authentication failed',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    // Attach auth context to request
    req.auth = result.context;
    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Authentication error');
    res.status(500).json({
      code: 'internal_error',
      message: 'An error occurred during authentication',
      request_id: req.requestId || 'unknown',
      details: {},
    });
  }
}
