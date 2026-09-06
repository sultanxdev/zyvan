// ─────────────────────────────────────────────────────────────
// Zyvan API — Request ID Middleware
// Generates a unique request_id for every request, included
// in all responses and log entries.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || `req_${uuidv4()}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
