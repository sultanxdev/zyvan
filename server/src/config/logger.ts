import pino from 'pino';
import { config } from './env';

/**
 * Structured logger using pino.
 *
 * Dev:  human-readable colored output via pino-pretty
 * Prod: JSON lines — suitable for log aggregation (Datadog, CloudWatch, etc.)
 */
export const logger = pino({
    level: config.isDev ? 'debug' : 'info',
    transport: config.isDev
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
