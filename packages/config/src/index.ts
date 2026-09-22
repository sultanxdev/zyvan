// ─────────────────────────────────────────────────────────────
// Zyvan Config Package — Shared Environment & Config Validation
// ─────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Automatically locate and load .env from monorepo root if available
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Better Auth & Security
  BETTER_AUTH_SECRET: z.string().min(16).default('zyvan_dev_better_auth_secret_99887766554433221100aabbccddeeff'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:4000'),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),

  // OAuth Credentials (optional)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Machine Key & Webhook Crypto
  API_KEY_PEPPER: z.string().min(16).default('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'),
  ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  HMAC_KEY_VERSION: z.string().default('v1'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment configuration');
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}
