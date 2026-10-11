// ─────────────────────────────────────────────────────────────
// Zyvan API — True Sliding-Window Rate Limiting Middleware
//
// Protects endpoints using atomic Redis Sorted Sets (sliding window log).
// Unlike fixed-window counters (INCR+EXPIRE), this prevents burst
// attacks across boundary edges.
//
// Architecture:
// 1. ipRateLimit: Coarse IP-based rate limit applied early before auth
//    to protect DB pool and auth services from DDoS.
// 2. identityRateLimit: Finer authenticated identity limit applied
//    after credential validation (scoped to API key or organization).
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';

export interface RateLimitConfig {
  windowMs: number; // e.g. 60_000 for 1 minute
  max: number;      // e.g. 1000 requests per window
  keyPrefix?: string;
  skip?: (req: Request) => boolean;
}

export interface SlidingWindowResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
}

/**
 * Lua script for atomic sliding window rate limiting in Redis using Sorted Sets.
 * KEYS[1]: rate limit key
 * ARGV[1]: window start timestamp in ms (now - windowMs)
 * ARGV[2]: current timestamp in ms (now)
 * ARGV[3]: unique member identifier (now:uuid)
 * ARGV[4]: windowMs (duration)
 * ARGV[5]: max allowed requests
 *
 * Returns: { allowed (1 or 0), currentCount, remaining, retryAfterSeconds }
 */
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local windowStart = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local member = ARGV[3]
local windowMs = tonumber(ARGV[4])
local maxLimit = tonumber(ARGV[5])

-- 1. Remove entries outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- 2. Count requests currently within the sliding window
local currentCount = redis.call('ZCARD', key)

if currentCount < maxLimit then
  -- Capacity available: record this request with score = now
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs)
  local remaining = maxLimit - (currentCount + 1)
  return { 1, currentCount + 1, remaining, 0 }
else
  -- Limit reached: find oldest event in window to calculate exact retryAfter
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = windowMs
  if oldest and #oldest >= 2 then
    local oldestScore = tonumber(oldest[2])
    retryAfterMs = (oldestScore + windowMs) - now
  end
  if retryAfterMs < 0 then
    retryAfterMs = 0
  end
  local retryAfterSec = math.ceil(retryAfterMs / 1000)
  if retryAfterSec < 1 then
    retryAfterSec = 1
  end
  return { 0, currentCount, 0, retryAfterSec }
end
`;

/**
 * Atomic sliding window evaluation in Redis.
 */
export async function evaluateSlidingWindow(
  key: string,
  maxLimit: number,
  windowMs: number
): Promise<SlidingWindowResult> {
  const redis = getRedisClient();
  if (!redis) {
    // Fail open if Redis is unavailable
    return {
      allowed: true,
      currentCount: 0,
      remaining: maxLimit,
      resetSeconds: Math.ceil(windowMs / 1000),
      retryAfterSeconds: 0,
    };
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const uniqueMember = `${now}:${crypto.randomUUID().slice(0, 8)}`;

  try {
    const result = (await redis.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      windowStart,
      now,
      uniqueMember,
      windowMs,
      maxLimit
    )) as [number, number, number, number];

    const allowed = result[0] === 1;
    const currentCount = result[1];
    const remaining = result[2];
    const retryAfterSeconds = result[3];
    const resetSeconds = Math.ceil(windowMs / 1000);

    return {
      allowed,
      currentCount,
      remaining,
      resetSeconds,
      retryAfterSeconds,
    };
  } catch (err) {
    logger.warn({ err, key }, 'Sliding window Redis rate limit evaluation failed — failing open');
    return {
      allowed: true,
      currentCount: 0,
      remaining: maxLimit,
      resetSeconds: Math.ceil(windowMs / 1000),
      retryAfterSeconds: 0,
    };
  }
}

/**
 * Safely extracts client IP address, avoiding untrusted header injection.
 */
export function getClientIp(req: Request): string {
  // express's req.ip already respects the 'trust proxy' setting
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

/**
 * Pre-Authentication Coarse IP Rate Limiter.
 * Protects edge endpoints from unauthenticated floods.
 */
export function createIpRateLimiter(options: Partial<RateLimitConfig> = {}) {
  const windowMs = options.windowMs ?? 60_000; // 1 minute default
  const max = options.max ?? 120;             // 120 requests/min default
  const prefix = options.keyPrefix ?? 'rl:ip';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (options.skip && options.skip(req)) {
      return next();
    }

    const ip = getClientIp(req);
    const key = `${prefix}:${ip}`;

    const { allowed, currentCount, remaining, resetSeconds, retryAfterSeconds } =
      await evaluateSlidingWindow(key, max, windowMs);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (!allowed) {
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        code: 'rate_limit_exceeded',
        message: `Too many requests from this IP. Please retry in ${retryAfterSeconds} seconds.`,
        request_id: req.requestId || 'unknown',
        details: {
          retry_after: retryAfterSeconds,
          limit: max,
          window_seconds: Math.ceil(windowMs / 1000),
        },
      });
      return;
    }

    next();
  };
}

/**
 * Post-Authentication Identity Rate Limiter.
 * Applied after credential validation (API key or Session Org ID).
 */
export function createIdentityRateLimiter(options: Partial<RateLimitConfig> = {}) {
  const windowMs = options.windowMs ?? 60_000;  // 1 minute default
  const max = options.max ?? 1000;              // 1000 requests/min default
  const prefix = options.keyPrefix ?? 'rl:identity';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (options.skip && options.skip(req)) {
      return next();
    }

    // Determine validated identity identifier
    const auth = req.auth;
    let identifier: string;

    if (auth?.type === 'apiKey') {
      identifier = `key:${auth.apiKeyId || auth.organizationId}`;
    } else if (auth?.organizationId) {
      identifier = `org:${auth.organizationId}`;
    } else if (auth?.userId) {
      identifier = `user:${auth.userId}`;
    } else {
      // Unauthenticated fallback to IP
      identifier = `ip:${getClientIp(req)}`;
    }

    const key = `${prefix}:${identifier}`;

    const { allowed, remaining, resetSeconds, retryAfterSeconds } =
      await evaluateSlidingWindow(key, max, windowMs);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (!allowed) {
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        code: 'rate_limit_exceeded',
        message: `Rate limit exceeded for this account. Please retry in ${retryAfterSeconds} seconds.`,
        request_id: req.requestId || 'unknown',
        details: {
          retry_after: retryAfterSeconds,
          limit: max,
          window_seconds: Math.ceil(windowMs / 1000),
        },
      });
      return;
    }

    next();
  };
}
