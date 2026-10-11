// ─────────────────────────────────────────────────────────────
// Zyvan API — Health Routes
// GET /health — Process alive
// GET /ready — PostgreSQL + RabbitMQ connectivity check
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { getPrismaClient } from '@zyvan/db';
import { isRabbitMQConnected } from '../lib/rabbitmq';
import { checkRedisHealth } from '../lib/redis';
import { logger } from '../lib/logger';

const router = Router();

// Liveness check — is the process running?
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Readiness check — are critical dependencies available?
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  // Check PostgreSQL
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'error';
    logger.error({ err }, 'Database readiness check failed');
  }

  // Check Redis
  const redisOk = await checkRedisHealth();
  checks.redis = redisOk ? 'ok' : 'error';
  if (!redisOk) {
    logger.warn('Redis readiness check failed — not responding');
  }

  // Check RabbitMQ
  checks.rabbitmq = isRabbitMQConnected() ? 'ok' : 'error';
  if (checks.rabbitmq === 'error') {
    logger.warn('RabbitMQ readiness check failed — not connected');
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    ...checks,
  });
});

export { router as healthRoutes };
