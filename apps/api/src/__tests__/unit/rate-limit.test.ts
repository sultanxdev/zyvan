import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  evaluateSlidingWindow,
  createIpRateLimiter,
  createIdentityRateLimiter,
} from '../../middleware/rate-limit';
import { setRedisClientForTesting } from '../../lib/redis';

describe('Sliding Window Rate Limiter Middleware', () => {
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      eval: vi.fn(),
    };
    setRedisClientForTesting(mockRedis);
  });

  describe('evaluateSlidingWindow', () => {
    it('returns allowed=true and calculates remaining capacity when within limit', async () => {
      // Lua returns: [ allowed (1), currentCount (3), remaining (7), retryAfter (0) ]
      mockRedis.eval.mockResolvedValueOnce([1, 3, 7, 0]);

      const result = await evaluateSlidingWindow('test:key', 10, 60_000);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(3);
      expect(result.remaining).toBe(7);
      expect(result.retryAfterSeconds).toBe(0);
      expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    });

    it('returns allowed=false and calculates Retry-After when limit exceeded', async () => {
      // Lua returns: [ allowed (0), currentCount (10), remaining (0), retryAfter (42) ]
      mockRedis.eval.mockResolvedValueOnce([0, 10, 0, 42]);

      const result = await evaluateSlidingWindow('test:key', 10, 60_000);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(10);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBe(42);
    });

    it('fails open when Redis client is unavailable', async () => {
      setRedisClientForTesting(null);

      const result = await evaluateSlidingWindow('test:key', 10, 60_000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });
  });

  describe('createIpRateLimiter Middleware', () => {
    it('sets standard rate limit headers on allowed requests', async () => {
      mockRedis.eval.mockResolvedValueOnce([1, 1, 99, 0]);

      const app = express();
      app.use(createIpRateLimiter({ max: 100, windowMs: 60_000 }));
      app.get('/test', (_req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('100');
      expect(res.headers['x-ratelimit-remaining']).toBe('99');
      expect(res.headers['x-ratelimit-reset']).toBe('60');
    });

    it('returns 429 Too Many Requests and Retry-After header on exceeded limit', async () => {
      mockRedis.eval.mockResolvedValueOnce([0, 100, 0, 15]);

      const app = express();
      app.use(createIpRateLimiter({ max: 100, windowMs: 60_000 }));
      app.get('/test', (_req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBe('15');
      expect(res.body.code).toBe('rate_limit_exceeded');
      expect(res.body.details.retry_after).toBe(15);
    });

    it('skips rate limiting when skip function returns true', async () => {
      const app = express();
      app.use(
        createIpRateLimiter({
          max: 5,
          skip: (req) => req.path === '/health',
        })
      );
      app.get('/health', (_req, res) => res.json({ status: 'ok' }));

      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });
  });

  describe('createIdentityRateLimiter Middleware', () => {
    it('scopes rate limit key to API key id when authenticated via API key', async () => {
      mockRedis.eval.mockResolvedValueOnce([1, 5, 995, 0]);

      const app = express();
      // Simulate auth middleware setting req.auth
      app.use((req, _res, next) => {
        (req as any).auth = {
          type: 'apiKey',
          apiKeyId: 'key_live_9999',
          organizationId: 'org_123',
        };
        next();
      });
      app.use(createIdentityRateLimiter({ max: 1000 }));
      app.get('/api/resource', (_req, res) => res.json({ success: true }));

      const res = await request(app).get('/api/resource');

      expect(res.status).toBe(200);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'rl:identity:key:key_live_9999',
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        60_000,
        1000
      );
    });

    it('scopes rate limit key to organization id when authenticated via session', async () => {
      mockRedis.eval.mockResolvedValueOnce([1, 1, 999, 0]);

      const app = express();
      app.use((req, _res, next) => {
        (req as any).auth = {
          type: 'session',
          organizationId: 'org_corp_abc',
          userId: 'user_42',
        };
        next();
      });
      app.use(createIdentityRateLimiter({ max: 1000 }));
      app.get('/api/resource', (_req, res) => res.json({ success: true }));

      const res = await request(app).get('/api/resource');

      expect(res.status).toBe(200);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'rl:identity:org:org_corp_abc',
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        60_000,
        1000
      );
    });
  });
});
