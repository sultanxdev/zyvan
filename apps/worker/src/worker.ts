// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Entry Point
//
// Consumes delivery jobs from RabbitMQ and processes webhook
// deliveries. Full implementation in Phase 5.
//
// Architecture:
//   RabbitMQ Queue → Worker → Load from PostgreSQL
//     → Check limits → Sign → Send HTTP → Record Attempt
//     → Success / Retry / DLQ
// ─────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import path from 'path';
import pino from 'pino';
import { getPrismaClient, disconnectPrisma } from '@zyvan/database';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    service: 'zyvan-worker',
    env: process.env.NODE_ENV || 'development',
  },
  // Redact sensitive fields
  redact: {
    paths: ['secret', 'password', 'apiKey', '*.secret', '*.password'],
    remove: true,
  },
});

// ─── Worker Startup ──────────────────────────────────────────

async function start(): Promise<void> {
  logger.info('🔧 Zyvan Worker starting...');

  // Initialize database connection
  const prisma = getPrismaClient();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('✅ Database connected');

  // RabbitMQ connection will be added in Phase 5
  // For now, just confirm the worker boots successfully
  logger.info('🚀 Zyvan Worker ready (delivery processing will be added in Phase 5)');
}

// ─── Graceful Shutdown ───────────────────────────────────────
// Stop consuming → finish active job → close connections → exit

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  try {
    // Close RabbitMQ consumer (Phase 5+)

    await disconnectPrisma();
    logger.info('Database connection closed');

    // Close Redis (Phase 5+)
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the worker
start().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
