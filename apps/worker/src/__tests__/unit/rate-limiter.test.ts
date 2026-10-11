import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../../services/destination-rate-limiter';
import { setRedisClientForTesting } from '../../lib/redis';

describe('Destination Rate Limiter Unit Tests', () => {
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      eval: vi.fn(),
    };
    setRedisClientForTesting(mockRedis);
  });

  it('allows requests within sliding rate limit', async () => {
    mockRedis.eval.mockResolvedValueOnce([1, 5]); // [allowed=1, currentCount=5]

    const result = await checkRateLimit('dest-1', 10);

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)"),
      1,
      'dest:dest-1:rate:sliding',
      expect.any(Number),
      expect.any(Number),
      expect.any(String),
      1000,
      10
    );
  });

  it('rejects requests exceeding sliding rate limit', async () => {
    mockRedis.eval.mockResolvedValueOnce([0, 11]); // [allowed=0, currentCount=11]

    const result = await checkRateLimit('dest-1', 10);

    expect(result.allowed).toBe(false);
    expect(result.currentCount).toBe(11);
  });

  it('fails open if Redis is null/unavailable', async () => {
    setRedisClientForTesting(null);

    const result = await checkRateLimit('dest-1', 10);

    expect(result.allowed).toBe(true);
  });
});
