// ─────────────────────────────────────────────────────────────
// Zyvan API — Error Handler Middleware
// Consistent error responses following the Zyvan error contract:
// { code, message, request_id, details }
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import type { ErrorCode } from '@zyvan/schemas';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, statusCode: number, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

// Map error codes to HTTP status codes
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  invalid_request: 400,
  authentication_failed: 401,
  authorization_denied: 403,
  duplicate_idempotency_key: 409,
  rate_limited: 429,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  internal_error: 500,
};

export function createAppError(code: ErrorCode, message: string, details: Record<string, unknown> = {}): AppError {
  return new AppError(code, message, ERROR_STATUS_MAP[code], details);
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      request_id: req.requestId || 'unknown',
      details: err.details,
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'invalid_request',
      message: 'Validation failed',
      request_id: req.requestId || 'unknown',
      details: {
        errors: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Unexpected errors — log and return generic 500
  logger.error(
    {
      err,
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    },
    'Unhandled error'
  );

  res.status(500).json({
    code: 'internal_error',
    message: 'An unexpected error occurred',
    request_id: req.requestId || 'unknown',
    details: {},
  });
}
