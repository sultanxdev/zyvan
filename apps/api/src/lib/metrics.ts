// ─────────────────────────────────────────────────────────────
// Zyvan API — Prometheus Observability & SLI Metrics
//
// Instruments core delivery infrastructure:
// - Webhook Latency (Histogram)
// - Delivery Success / Failure Rate (Counter)
// - Queue Age & Outbox Depth (Gauge)
// - Retry Tiers & Rate (Counter)
// - Dead-Letter Count (Counter)
// - HTTP API Request Duration & Error Rate (Histogram)
// ─────────────────────────────────────────────────────────────

import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Enable default Node.js runtime metrics (GC, event loop, memory)
client.collectDefaultMetrics({ prefix: 'zyvan_' });

export const metricsRegistry = client.register;

// ─── Webhook Delivery & Event Pipeline Metrics ─────────────────

export const webhookDeliveryDuration = new client.Histogram({
  name: 'zyvan_webhook_delivery_duration_seconds',
  help: 'Latency of outbound webhook delivery HTTP requests in seconds',
  labelNames: ['status_code', 'outcome'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const deliveryAttemptsTotal = new client.Counter({
  name: 'zyvan_delivery_attempts_total',
  help: 'Total number of webhook delivery attempts executed',
  labelNames: ['status', 'outcome'],
});

export const eventIngestionTotal = new client.Counter({
  name: 'zyvan_events_ingested_total',
  help: 'Total events ingested through API',
  labelNames: ['type', 'duplicate'],
});

export const retryScheduledTotal = new client.Counter({
  name: 'zyvan_retries_scheduled_total',
  help: 'Total delivery retries routed into tiered DLX queues',
  labelNames: ['tier', 'reason'],
});

export const deadLettersTotal = new client.Counter({
  name: 'zyvan_dead_letters_total',
  help: 'Total deliveries transitioned to Dead Letter Queue',
  labelNames: ['reason'],
});

export const outboxDepthGauge = new client.Gauge({
  name: 'zyvan_outbox_depth',
  help: 'Number of pending outbox rows awaiting publisher confirm',
});

// ─── API Server Metrics ───────────────────────────────────────

export const apiHttpDuration = new client.Histogram({
  name: 'zyvan_api_http_request_duration_seconds',
  help: 'HTTP request duration for Zyvan API endpoints',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

export const apiErrorsTotal = new client.Counter({
  name: 'zyvan_api_errors_total',
  help: 'Total 4xx and 5xx errors returned by API',
  labelNames: ['method', 'route', 'code'],
});

/**
 * Middleware tracking HTTP latency and status codes for Prometheus.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationSec = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const statusCode = res.statusCode.toString();

    apiHttpDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationSec
    );

    if (res.statusCode >= 400) {
      apiErrorsTotal.inc({
        method: req.method,
        route,
        code: statusCode,
      });
    }
  });

  next();
}

/**
 * Guard securing /metrics from unauthorized public access.
 * Allows access if METRICS_TOKEN header matches or if in development.
 */
export function metricsAuthGuard(req: Request, res: Response, next: NextFunction): void {
  const configuredToken = process.env.METRICS_TOKEN;

  // In production, require authentication token if configured
  if (configuredToken) {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const queryToken = req.query.token as string | undefined;

    if (bearerToken !== configuredToken && queryToken !== configuredToken) {
      res.status(403).json({
        code: 'forbidden',
        message: 'Metrics endpoint is protected and restricted to authorized scrapers.',
      });
      return;
    }
  }

  next();
}
