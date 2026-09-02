import { describe, it, expect } from 'vitest';
import { AppError, createAppError } from '../../middleware/error-handler';

describe('Error Handler & Error Contract', () => {
  it('creates AppError with correct status code mapping', () => {
    const notFound = createAppError('not_found', 'Resource not found');
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('not_found');

    const authFailed = createAppError('authentication_failed', 'Bad key');
    expect(authFailed.statusCode).toBe(401);

    const denied = createAppError('authorization_denied', 'No permission');
    expect(denied.statusCode).toBe(403);

    const dup = createAppError('duplicate_idempotency_key', 'Duplicate');
    expect(dup.statusCode).toBe(409);

    const rateLimited = createAppError('rate_limited', 'Too many requests');
    expect(rateLimited.statusCode).toBe(429);
  });

  it('attaches custom details to AppError', () => {
    const error = new AppError('invalid_request', 'Invalid payload', 400, {
      field: 'type',
      issue: 'required',
    });
    expect(error.details).toEqual({ field: 'type', issue: 'required' });
  });
});
