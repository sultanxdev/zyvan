import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/env';
import { eventRouter } from './api/events/route';

const app = express();

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check (no auth) ────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────
app.use('/v1/events', eventRouter);

// ── 404 handler ───────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────
app.listen(config.port, () => {
    console.log(`[Zyvan] Server running on http://localhost:${config.port}`);
    console.log(`[Zyvan] Environment: ${config.nodeEnv}`);
});

export default app;