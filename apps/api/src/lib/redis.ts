// ─────────────────────────────────────────────────────────────
// Zyvan API — Redis Client Manager
// Singleton Redis connection using ioredis for distributed
// rate limiting, session caching, and live cursor coordination.
// ─────────────────────────────────────────────────────────────

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 100, 1000);
        },
      });

      redisClient.on('error', (err) => {
        logger.warn({ err: err.message }, 'Redis client connection warning');
      });

      redisClient.on('connect', () => {
        logger.info('Connected to Redis');
      });
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Redis client');
      redisClient = null;
    }
  }
  return redisClient;
}

export function setRedisClientForTesting(client: any): void {
  redisClient = client;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
  }
}

/**
 * Health check ping for Redis.
 * Returns true if Redis responds with PONG within timeoutMs, otherwise false.
 */
export async function checkRedisHealth(timeoutMs = 1500): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const pingPromise = client.ping();
    const timeoutPromise = new Promise<'timeout'>((_, reject) =>
      setTimeout(() => reject(new Error('Redis ping timeout')), timeoutMs)
    );

    const res = await Promise.race([pingPromise, timeoutPromise]);
    return res === 'PONG';
  } catch {
    return false;
  }
}
