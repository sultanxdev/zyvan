// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Destination Concurrency Limiter
//
// Slot-based leases using Redis SET NX PX to limit concurrent
// active delivery attempts to a specific destination endpoint.
//
// Reliability Architecture:
// 1. Slot keys: dest:<id>:slot:1..N
// 2. Acquired with SET NX PX 60000 and unique UUID token
// 3. Released with token-matching Lua script
// 4. Immune to counter leak: dead workers lose leases automatically after 60s
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { getRedisClient } from '../lib/redis';

export interface SlotLeaseResult {
  acquired: boolean;
  slotKey?: string;
  token?: string;
}

const RELEASE_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export const DEFAULT_CONCURRENCY_LIMIT = 5;
export const CONCURRENCY_LEASE_MS = 60_000;

/**
 * Acquire a concurrency slot lease for a destination.
 * Checks slots 1 through limit. Returns on first free slot.
 */
export async function acquireSlotLease(
  destinationId: string,
  limit: number = DEFAULT_CONCURRENCY_LIMIT,
  leaseMs: number = CONCURRENCY_LEASE_MS
): Promise<SlotLeaseResult> {
  const redis = getRedisClient();
  if (!redis) {
    // If Redis is not available, fail open to avoid halting delivery
    return { acquired: true };
  }

  const token = crypto.randomUUID();

  try {
    for (let slot = 1; slot <= limit; slot++) {
      const slotKey = `dest:${destinationId}:slot:${slot}`;
      // SET key token PX leaseMs NX
      const res = await redis.set(slotKey, token, 'PX', leaseMs, 'NX');
      if (res === 'OK') {
        return {
          acquired: true,
          slotKey,
          token,
        };
      }
    }
  } catch {
    // On Redis connection error, fail open
    return { acquired: true };
  }

  // All slots busy
  return { acquired: false };
}

/**
 * Release an acquired slot lease using safe token-matching Lua script.
 */
export async function releaseSlotLease(
  slotKey?: string,
  token?: string
): Promise<boolean> {
  if (!slotKey || !token) return true;

  const redis = getRedisClient();
  if (!redis) return true;

  try {
    const res = await redis.eval(RELEASE_LUA_SCRIPT, 1, slotKey, token);
    return res === 1;
  } catch {
    return false;
  }
}
