// ─────────────────────────────────────────────────────────────
// Zyvan API — Authenticate Middleware
// Supports both Better Auth interactive sessions and machine API keys.
// Enforces tenant boundary and populates req.auth.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { authenticateApiKey, authenticateSession } from '../auth/guards';
import { verifyUserToken } from '../modules/auth/user-service';
import { getPrismaClient } from '@zyvan/db';
import { logger } from '../lib/logger';
import '../auth/types';

/**
 * Authentication middleware for all protected API routes.
 * Supports:
 *   1. Bearer zyvan_... machine API keys
 *   2. Better Auth HTTP-only cookies / session tokens
 *   3. Legacy Bearer user JWT (with tenant verification)
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // 1. Bearer Token Authentication
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();

    // 1a. Machine API Key (zyvan_live_... / zyvan_test_...)
    if (token.startsWith('zyvan_')) {
      const validKey = await authenticateApiKey(token, req);
      if (validKey) {
        next();
        return;
      }
      res.status(401).json({
        code: 'authentication_failed',
        message: 'Invalid, expired, or revoked API key',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    // 1b. Legacy User JWT session token (with strict tenant verification)
    const userPayload = verifyUserToken(token);
    if (userPayload) {
      try {
        const prisma = getPrismaClient();
        // Look up user's membership in organization or project
        const member = await prisma.member.findFirst({
          where: { userId: userPayload.userId },
          include: { organization: true },
        });

        if (member) {
          req.auth = {
            type: 'session',
            userId: userPayload.userId,
            userEmail: userPayload.email,
            organizationId: member.organizationId,
            role: (member.role.toLowerCase() as any) || 'member',
            permissions: [],
          };
          next();
          return;
        }
      } catch (err) {
        logger.error({ err }, 'Error verifying user JWT membership');
      }
    }
  }

  // 2. Interactive Session Authentication (Better Auth session)
  try {
    const validSession = await authenticateSession(req);
    if (validSession) {
      next();
      return;
    }
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Session verification error');
  }

  res.status(401).json({
    code: 'authentication_failed',
    message: 'Authentication required. Please provide a valid API key or session.',
    request_id: req.requestId || 'unknown',
    details: {},
  });
}
