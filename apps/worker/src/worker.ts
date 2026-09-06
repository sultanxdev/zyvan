// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Entry Point
//
// RabbitMQ consumer that processes webhook deliveries.
//
// Architecture:
//   RabbitMQ Queue → Worker → Load from PostgreSQL
//     → Check limits → Sign → Send HTTP → Record Attempt
//     → Success / Retry / DLQ
//
// The worker is stateless — all state comes from PostgreSQL.
// If the worker crashes, RabbitMQ redelivers unacked messages.
// ─────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import path from 'path';
import pino from 'pino';
import { getPrismaClient, disconnectPrisma } from '@zyvan/database';
import {
  connectRabbitMQ,
  disconnectRabbitMQ,
  getChannel,
  DELIVERY_QUEUE,
} from './lib/rabbitmq';
import { processDelivery } from './services/delivery-service';
import type { DeliveryJob } from './services/delivery-service';

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

// ─── Configuration ───────────────────────────────────────────

const config = {
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  hmacVersion: process.env.HMAC_KEY_VERSION || 'v1',
  prefetch: parseInt(process.env.WORKER_PREFETCH || '5', 10),
};

// ─── Worker Startup ──────────────────────────────────────────

let isShuttingDown = false;

async function start(): Promise<void> {
  logger.info('🔧 Zyvan Worker starting...');

  // Validate required config
  if (!config.encryptionKey) {
    throw new Error('ENCRYPTION_KEY is required');
  }

  // Initialize database connection
  const prisma = getPrismaClient();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('✅ Database connected');

  // Connect to RabbitMQ
  await connectRabbitMQ(config.rabbitmqUrl, config.prefetch, logger);

  // Start consuming from the delivery queue
  const channel = getChannel();

  channel.consume(
    DELIVERY_QUEUE,
    async (msg) => {
      if (!msg || isShuttingDown) return;

      let job: DeliveryJob;

      try {
        job = JSON.parse(msg.content.toString());
      } catch (err) {
        logger.error({ err, content: msg.content.toString() }, 'Invalid job payload — discarding');
        channel.ack(msg);
        return;
      }

      try {
        const processed = await processDelivery(
          job,
          config.encryptionKey,
          config.hmacVersion,
          logger
        );

        if (processed) {
          channel.ack(msg);
        } else {
          // Nack with requeue — destination/tenant paused, retry later
          channel.nack(msg, false, true);
        }
      } catch (err) {
        logger.error(
          { err, deliveryId: job.deliveryId, eventId: job.eventId },
          'Unexpected error processing delivery'
        );
        // Nack with requeue on unexpected errors — don't lose the message
        channel.nack(msg, false, true);
      }
    },
    {
      noAck: false, // Manual acknowledgment — critical for reliability
    }
  );

  logger.info(
    { prefetch: config.prefetch, queue: DELIVERY_QUEUE },
    '🚀 Zyvan Worker ready — consuming delivery jobs'
  );
}

// ─── Graceful Shutdown ───────────────────────────────────────
// Stop consuming → finish active job → close connections → exit

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  try {
    // Close RabbitMQ (stops consuming, finishes current messages)
    await disconnectRabbitMQ(logger);

    // Close database
    await disconnectPrisma();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
  gracefulShutdown('unhandledRejection');
});

// Start the worker
start().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
