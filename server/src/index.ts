import express from 'express';
import { config } from './config/env';

const app = express();

// Middleware
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (no auth required)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(config.port, () => {
    console.log(`[Zyvan] Server running on http://localhost:${config.port}`);
    console.log(`[Zyvan] Environment: ${config.nodeEnv}`);
});

export default app;