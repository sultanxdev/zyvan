// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Redis Client Manager
// Singleton Redis connection using ioredis for distributed
// concurrency slots and destination rate limiting.
// ─────────────────────────────────────────────────────────────

import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: (times) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 100, 1000);
        },
      });

      redisClient.on('error', (_err) => {
        // Log suppressed to prevent noise when Redis is optionally inactive
      });
    } catch {
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
