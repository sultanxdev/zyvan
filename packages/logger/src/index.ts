// ─────────────────────────────────────────────────────────────
// Zyvan Logger Package — Structured Pino Logging with Redaction
// ─────────────────────────────────────────────────────────────

import pino from 'pino';

export function createLogger(serviceName: string) {
  return pino({
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
      service: serviceName,
      env: process.env.NODE_ENV || 'development',
    },
    redact: {
      paths: [
        'password',
        'secret',
        'apiKey',
        'token',
        'authorization',
        'cookie',
        '*.password',
        '*.secret',
        '*.apiKey',
        '*.token',
      ],
      remove: true,
    },
  });
}

export const logger = createLogger('zyvan');
