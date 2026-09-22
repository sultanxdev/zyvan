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

  it('allows requests within rate limit', async () => {
    mockRedis.eval.mockResolvedValueOnce(5); // 5th request in current second

    const result = await checkRateLimit('dest-1', 10);

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR', KEYS[1])"),
      1,
      expect.stringMatching(/^dest:dest-1:rate:\d+$/)
    );
  });

  it('rejects requests exceeding rate limit', async () => {
    mockRedis.eval.mockResolvedValueOnce(11); // 11th request when limit is 10

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
