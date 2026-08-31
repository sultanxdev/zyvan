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
import { healthRoutes } from './routes/health';
import { getPrismaClient, disconnectPrisma } from '@zyvan/database';

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

// API v1 routes (will be added in Phase 2+)
// app.use('/v1/projects', projectRoutes);
// app.use('/v1/api-keys', apiKeyRoutes);
// app.use('/v1/tenants', tenantRoutes);
// app.use('/v1/destinations', destinationRoutes);
// app.use('/v1/events', eventRoutes);
// app.use('/v1/usage', usageRoutes);

// API root info
app.get('/v1', (_req, res) => {
  res.json({
    name: 'Zyvan API',
    version: '0.1.0',
    description: 'Reliable Webhook & Event Delivery Infrastructure',
  });
});

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

    // Close Redis connection (Phase 2+)
    // Close RabbitMQ connection (Phase 5+)

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
