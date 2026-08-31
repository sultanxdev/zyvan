// ─────────────────────────────────────────────────────────────
// Zyvan API — Configuration
// Centralized config loaded from environment variables.
// ─────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Queue (RabbitMQ)
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Security
  apiKeyPepper: process.env.API_KEY_PEPPER || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
  hmacKeyVersion: process.env.HMAC_KEY_VERSION || 'v1',
  jwtSecret: process.env.JWT_SECRET || '',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

// Validate required config at startup
export function validateConfig(): void {
  const required: Array<{ key: keyof typeof config; name: string }> = [
    { key: 'databaseUrl', name: 'DATABASE_URL' },
    { key: 'apiKeyPepper', name: 'API_KEY_PEPPER' },
    { key: 'encryptionKey', name: 'ENCRYPTION_KEY' },
    { key: 'jwtSecret', name: 'JWT_SECRET' },
  ];

  const missing = required.filter(({ key }) => !config[key]);

  if (missing.length > 0) {
    const names = missing.map((m) => m.name).join(', ');
    throw new Error(`Missing required environment variables: ${names}`);
  }
}
