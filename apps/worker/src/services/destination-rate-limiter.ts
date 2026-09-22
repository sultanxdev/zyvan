// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Destination Rate Limiter
//
// Fixed 1-second window rate limiter using atomic Redis Lua:
// INCR + EXPIRE 2s.
// Protects downstream webhook receivers from being overwhelmed.
// ─────────────────────────────────────────────────────────────

import { getRedisClient } from '../lib/redis';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
}

const RATE_LIMIT_LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], 2)
end
return current
`;

export const DEFAULT_RATE_LIMIT_PER_SEC = 50;

/**
 * Check if the destination has capacity within the current 1-second window.
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

  const currentSecond = Math.floor(Date.now() / 1000);
  const rateKey = `dest:${destinationId}:rate:${currentSecond}`;

  try {
    const current = (await redis.eval(
      RATE_LIMIT_LUA_SCRIPT,
      1,
      rateKey
    )) as number;

    const allowed = current <= limitPerSecond;
    return {
      allowed,
      currentCount: current,
    };
  } catch {
    // On Redis error, fail open
    return { allowed: true, currentCount: 0 };
  }
}
