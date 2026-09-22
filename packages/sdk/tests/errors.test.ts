import { describe, it, expect } from 'vitest';
import {
  ZyvanError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  parseRetryAfter,
  createZyvanErrorFromResponse,
} from '../src/errors';

describe('PR 4.1: SDK Error Hierarchy & Parsing', () => {
  describe('Error Inheritance & Properties', () => {
    it('ZyvanError sets properties and preserves prototype chain', () => {
      const error = new ZyvanError('Something went wrong', {
        statusCode: 418,
        code: 'teapot',
        requestId: 'req_123',
        details: { foo: 'bar' },
        rawBody: { message: 'I am a teapot' },
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZyvanError);
      expect(error.name).toBe('ZyvanError');
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('teapot');
      expect(error.requestId).toBe('req_123');
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.rawBody).toEqual({ message: 'I am a teapot' });
    });

    it('AuthenticationError maps to 401 and authentication_failed', () => {
      const error = new AuthenticationError();
      expect(error).toBeInstanceOf(ZyvanError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('authentication_failed');
    });

    it('AuthorizationError maps to 403 and authorization_denied', () => {
      const error = new AuthorizationError();
      expect(error).toBeInstanceOf(ZyvanError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.name).toBe('AuthorizationError');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('authorization_denied');
    });

    it('ValidationError maps to 400 and invalid_request', () => {
      const error = new ValidationError('Bad request payload');
      expect(error).toBeInstanceOf(ZyvanError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('invalid_request');
      expect(error.message).toBe('Bad request payload');
    });

    it('NotFoundError maps to 404 and not_found', () => {
      const error = new NotFoundError('Destination not found');
      expect(error).toBeInstanceOf(ZyvanError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.name).toBe('NotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('not_found');
    });

    it('ConflictError maps to 409 and conflict', () => {
      const error = new ConflictError('Duplicate idempotency key');
      expect(error).toBeInstanceOf(ZyvanError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.name).toBe('ConflictError');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('conflict');
    });

    it('RateLimitError maps to 429 and rate_limited with retryAfter in ms', () => {
      const error = new RateLimitError('Too many calls', {
        retryAfter: 5000,
        retryAfterHeader: '5',
      });
      expect(error).toBeInstanceOf(ZyvanError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.name).toBe('RateLimitError');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('rate_limited');
      expect(error.retryAfter).toBe(5000);
      expect(error.retryAfterHeader).toBe('5');
    });

    it('ServerError maps to 5xx codes and ServerError class', () => {
      const error500 = new ServerError();
      expect(error500).toBeInstanceOf(ZyvanError);
      expect(error500).toBeInstanceOf(ServerError);
      expect(error500.name).toBe('ServerError');
      expect(error500.statusCode).toBe(500);

      const error502 = new ServerError('Bad gateway from upstream proxy', { statusCode: 502 });
      expect(error502.statusCode).toBe(502);
      expect(error502).toBeInstanceOf(ServerError);
    });

    it('NetworkError handles TIMEOUT, ABORTED, and NETWORK_ERROR codes', () => {
      const timeoutErr = new NetworkError('Request timed out', { code: 'TIMEOUT' });
      expect(timeoutErr).toBeInstanceOf(ZyvanError);
      expect(timeoutErr).toBeInstanceOf(NetworkError);
      expect(timeoutErr.name).toBe('NetworkError');
      expect(timeoutErr.code).toBe('TIMEOUT');

      const abortErr = new NetworkError('Aborted by caller', { code: 'ABORTED' });
      expect(abortErr.code).toBe('ABORTED');

      const genericErr = new NetworkError('ECONNREFUSED');
      expect(genericErr.code).toBe('NETWORK_ERROR');
    });
  });

  describe('parseRetryAfter', () => {
    it('parses integer seconds into milliseconds', () => {
      expect(parseRetryAfter('10')).toBe(10000);
      expect(parseRetryAfter('0')).toBe(0);
      expect(parseRetryAfter(' 120 ')).toBe(120000);
    });

    it('parses valid HTTP-date into milliseconds difference', () => {
      const futureDate = new Date(Date.now() + 60000).toUTCString();
      const ms = parseRetryAfter(futureDate);
      expect(ms).toBeDefined();
      expect(ms).toBeGreaterThan(50000);
      expect(ms).toBeLessThanOrEqual(61000);
    });

    it('returns undefined for missing, empty, or invalid header', () => {
      expect(parseRetryAfter(undefined)).toBeUndefined();
      expect(parseRetryAfter(null)).toBeUndefined();
      expect(parseRetryAfter('')).toBeUndefined();
      expect(parseRetryAfter('not-a-number-or-date')).toBeUndefined();
    });
  });

  describe('createZyvanErrorFromResponse', () => {
    it('parses standard Zyvan JSON error payload', () => {
      const headers = new Headers({ 'x-request-id': 'header_req_1' });
      const rawText = JSON.stringify({
        code: 'not_found',
        message: 'Delivery record not found',
        request_id: 'body_req_1',
        details: { deliveryId: 'del-123' },
      });

      const err = createZyvanErrorFromResponse({ statusCode: 404, rawText, headers });
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('not_found');
      expect(err.message).toBe('Delivery record not found');
      expect(err.requestId).toBe('body_req_1');
      expect(err.details).toEqual({ deliveryId: 'del-123' });
    });

    it('handles non-JSON plain text body without throwing JSON parse error', () => {
      const headers = new Headers({ 'x-request-id': 'req_plain' });
      const err = createZyvanErrorFromResponse({
        statusCode: 503,
        rawText: 'Service Unavailable: Gateway overloaded',
        headers,
      });

      expect(err).toBeInstanceOf(ServerError);
      expect(err.statusCode).toBe(503);
      expect(err.message).toBe('Service Unavailable: Gateway overloaded');
      expect(err.requestId).toBe('req_plain');
      expect(err.rawBody).toBe('Service Unavailable: Gateway overloaded');
    });

    it('handles non-JSON HTML body gracefully (e.g. Cloudflare / Nginx 502)', () => {
      const headers = new Headers({ 'x-request-id': 'req_html' });
      const htmlBody = '<html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1></body></html>';
      const err = createZyvanErrorFromResponse({
        statusCode: 502,
        rawText: htmlBody,
        headers,
      });

      expect(err).toBeInstanceOf(ServerError);
      expect(err.statusCode).toBe(502);
      expect(err.message).toBe('HTTP 502 error');
      expect(err.requestId).toBe('req_html');
      expect(err.rawBody).toBe(htmlBody);
    });

    it('handles completely empty error body', () => {
      const headers = new Headers({ 'x-request-id': 'req_empty' });
      const err = createZyvanErrorFromResponse({
        statusCode: 500,
        rawText: '',
        headers,
      });

      expect(err).toBeInstanceOf(ServerError);
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('HTTP 500 error');
      expect(err.requestId).toBe('req_empty');
    });

    it('parses Retry-After header on 429 errors', () => {
      const headers = new Headers({
        'x-request-id': 'req_rl',
        'retry-after': '30',
      });
      const rawText = JSON.stringify({
        code: 'rate_limited',
        message: 'Rate limit exceeded for endpoint',
      });

      const err = createZyvanErrorFromResponse({ statusCode: 429, rawText, headers });
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.statusCode).toBe(429);
      expect((err as RateLimitError).retryAfter).toBe(30000);
      expect((err as RateLimitError).retryAfterHeader).toBe('30');
    });
  });
});
