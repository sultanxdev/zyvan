// ─────────────────────────────────────────────────────────────
// Zyvan API — Structured Logger (Pino)
// JSON-formatted structured logging with correlation IDs.
// ─────────────────────────────────────────────────────────────

import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.logLevel,
  transport:
    config.env === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    service: 'zyvan-api',
    env: config.env,
  },
  // Redact sensitive fields — secrets should never appear in logs
  redact: {
    paths: [
      'req.headers.authorization',
      'secret',
      'password',
      'apiKey',
      'key',
      'token',
      'secretRef',
      '*.secret',
      '*.password',
      '*.apiKey',
    ],
    remove: true,
  },
});
