// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Destination Rate Limiter
//
// True sliding-window rate limiter using atomic Redis Sorted Sets:
// Evaluates exact requests within the preceding 1000ms window.
// Prevents boundary burst overflows against downstream webhook endpoints.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { getRedisClient } from '../lib/redis';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
}

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local windowStart = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local member = ARGV[3]
local windowMs = tonumber(ARGV[4])
local maxLimit = tonumber(ARGV[5])

-- Purge elements outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count elements currently in window
local currentCount = redis.call('ZCARD', key)

if currentCount < maxLimit then
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs * 2)
  return { 1, currentCount + 1 }
else
  return { 0, currentCount }
end
`;

export const DEFAULT_RATE_LIMIT_PER_SEC = 50;

/**
 * Check if the destination has capacity within the sliding 1-second window.
 */
export async function checkRateLimit(
  destinationId: string,
  limitPerSecond: number = DEFAULT_RATE_LIMIT_PER_SEC
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (!redis) {
    // If Redis is not available, fail open
    return { allowed: true, currentCount: 0 };
  }

  const rateKey = `dest:${destinationId}:rate:sliding`;
  const now = Date.now();
  const windowMs = 1000;
  const windowStart = now - windowMs;
  const member = `${now}:${crypto.randomUUID().slice(0, 8)}`;

  try {
    const [allowedNum, currentCount] = (await redis.eval(
      SLIDING_WINDOW_LUA,
      1,
      rateKey,
      windowStart,
      now,
      member,
      windowMs,
      limitPerSecond
    )) as [number, number];

    return {
      allowed: allowedNum === 1,
      currentCount,
    };
  } catch {
    // On Redis error, fail open
    return { allowed: true, currentCount: 0 };
  }
}
