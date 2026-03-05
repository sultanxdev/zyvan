import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/env';
import { logger } from './config/logger';
import { db } from './config/db';
import { eventRouter } from './api/events/route';
import { endpointRouter } from './api/endpoints/route';
import { keysRouter } from './api/keys/route';
import { authMiddleware } from './middleware/auth';

// ── Start the BullMQ dispatch worker alongside the API ────
import './workers/dispatch';

const app = express();

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging middleware ────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info('HTTP request', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            ms: Date.now() - start,
        });
    });
    next();
});

// ── Health check (no auth) ────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Analytics summary (auth required) ────────────────────
app.get(
    '/v1/analytics/summary',
    authMiddleware,
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const [total, delivered, deadLettered, retrying, dispatching] = await Promise.all([
                db.event.count(),
                db.event.count({ where: { status: 'DELIVERED' } }),
                db.event.count({ where: { status: 'DEAD_LETTERED' } }),
                db.event.count({ where: { status: 'RETRY_SCHEDULED' } }),
                db.event.count({ where: { status: 'DISPATCHING' } }),
            ]);

            const successRate = total > 0
                ? ((delivered / total) * 100).toFixed(2) + '%'
                : 'N/A';

            res.json({
                total,
                delivered,
                dead_lettered: deadLettered,
                retrying,
                dispatching,
                pending: total - delivered - deadLettered,
                success_rate: successRate,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── API Routes ────────────────────────────────────────────
app.use('/v1/events', eventRouter);
app.use('/v1/endpoints', endpointRouter);
app.use('/v1/api-keys', keysRouter);

// ── 404 handler ───────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────
app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port}`, {
        env: config.nodeEnv,
        port: config.port,
    });
});

export default app;