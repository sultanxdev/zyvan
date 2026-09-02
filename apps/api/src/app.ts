// ─────────────────────────────────────────────────────────────
// Zyvan API — Express Application Entry Point
//
// Architecture:
//   Client → Express API (Auth/Validation/Idempotency)
//       → PostgreSQL (Source of Truth)
//       → RabbitMQ (Execution Layer)
//       → Workers (Delivery/Retry/DLQ)
// ─────────────────────────────────────────────────────────────

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config, validateConfig } from './config';
import { logger } from './lib/logger';
import { requestIdMiddleware } from './middleware/request-id';
import { errorHandler } from './middleware/error-handler';
import { authenticate } from './middleware/authenticate';
import { healthRoutes } from './routes/health';
import { bootstrapRoutes } from './modules/bootstrap/routes';
import { apiKeyRoutes } from './modules/api-keys/routes';
import { projectRoutes } from './modules/projects/routes';
import { tenantRoutes } from './modules/tenants/routes';
import { destinationRoutes } from './modules/destinations/routes';
import { getPrismaClient, disconnectPrisma } from '@zyvan/database';
import { connectRabbitMQ, disconnectRabbitMQ } from './lib/rabbitmq';

// ─── Validate Config ─────────────────────────────────────────

validateConfig();

// ─── Create Express App ──────────────────────────────────────

const app = express();

// ─── Global Middleware ───────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// ─── Request Logging ─────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// ─── Routes ──────────────────────────────────────────────────

// Health & readiness (no auth required)
app.use('/', healthRoutes);

// Bootstrap (no auth — only works when zero projects exist)
app.use('/v1/bootstrap', bootstrapRoutes);

// API root info (no auth)
app.get('/v1', (_req, res) => {
  res.json({
    name: 'Zyvan API',
    version: '0.1.0',
    description: 'Reliable Webhook & Event Delivery Infrastructure',
  });
});

// ─── Authenticated API v1 Routes ─────────────────────────────
// All routes below require a valid API key (Bearer token).

app.use('/v1/api-keys', authenticate, apiKeyRoutes);
app.use('/v1/projects', authenticate, projectRoutes);
app.use('/v1/tenants', authenticate, tenantRoutes);
app.use('/v1/destinations', authenticate, destinationRoutes);

// Events & Usage routes (Phase 5+)
// app.use('/v1/events', authenticate, eventRoutes);
// app.use('/v1/usage', authenticate, usageRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    code: 'not_found',
    message: 'The requested endpoint does not exist',
    request_id: _req.requestId || 'unknown',
    details: {},
  });
});

// ─── Error Handler ───────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────

const server = app.listen(config.port, async () => {
  logger.info(
    {
      port: config.port,
      env: config.env,
    },
    `🚀 Zyvan API running on port ${config.port} [${config.env}]`
  );

  // Initialize database connection (non-blocking — API serves health even without DB)
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connected');
  } catch (err) {
    logger.warn({ err }, '⚠️  Database not available — start PostgreSQL and retry');
  }

  // Initialize RabbitMQ connection
  try {
    await connectRabbitMQ();
  } catch (err) {
    logger.warn({ err }, '⚠️  RabbitMQ not available — start RabbitMQ and retry');
  }
});

// ─── Graceful Shutdown ───────────────────────────────────────
// Stop accepting new requests → finish active → close DB pool → exit

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await disconnectPrisma();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error({ err }, 'Error closing database connection');
    }

    try {
      await disconnectRabbitMQ();
    } catch (err) {
      logger.error({ err }, 'Error closing RabbitMQ connection');
    }

    logger.info('Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app };
