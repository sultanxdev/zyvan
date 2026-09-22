import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  acquireSlotLease,
  releaseSlotLease,
} from '../../services/destination-concurrency';
import { setRedisClientForTesting } from '../../lib/redis';

describe('Destination Concurrency Limiter Unit Tests', () => {
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      set: vi.fn(),
      eval: vi.fn(),
    };
    setRedisClientForTesting(mockRedis);
  });

  it('acquires the first available slot when free', async () => {
    mockRedis.set.mockResolvedValueOnce('OK');

    const result = await acquireSlotLease('dest-1', 3, 60000);

    expect(result.acquired).toBe(true);
    expect(result.slotKey).toBe('dest:dest-1:slot:1');
    expect(result.token).toBeDefined();
    expect(mockRedis.set).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'dest:dest-1:slot:1',
      result.token,
      'PX',
      60000,
      'NX'
    );
  });

  it('scans through slots until an available slot is found', async () => {
    mockRedis.set
      .mockResolvedValueOnce(null) // slot 1 busy
      .mockResolvedValueOnce('OK'); // slot 2 free

    const result = await acquireSlotLease('dest-1', 3, 60000);

    expect(result.acquired).toBe(true);
    expect(result.slotKey).toBe('dest:dest-1:slot:2');
    expect(mockRedis.set).toHaveBeenCalledTimes(2);
  });

  it('returns acquired: false when all slots are busy', async () => {
    mockRedis.set
      .mockResolvedValueOnce(null) // slot 1 busy
      .mockResolvedValueOnce(null) // slot 2 busy
      .mockResolvedValueOnce(null); // slot 3 busy

    const result = await acquireSlotLease('dest-1', 3, 60000);

    expect(result.acquired).toBe(false);
    expect(mockRedis.set).toHaveBeenCalledTimes(3);
  });

  it('releases slot lease with token-checking Lua script', async () => {
    mockRedis.eval.mockResolvedValueOnce(1);

    const released = await releaseSlotLease('dest:dest-1:slot:1', 'test-token');

    expect(released).toBe(true);
    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'),
      1,
      'dest:dest-1:slot:1',
      'test-token'
    );
  });

  it('fails open if Redis is null/unavailable', async () => {
    setRedisClientForTesting(null);

    const result = await acquireSlotLease('dest-1', 3);
    expect(result.acquired).toBe(true);
  });
});
