import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL!,
    apiKeySecret: process.env.API_KEY_SECRET!,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV !== 'production',
};

// Fail fast — crash on startup if critical config is missing
const required = ['DATABASE_URL', 'REDIS_URL', 'API_KEY_SECRET'] as const;
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`[Config] Missing required environment variable: ${key}`);
    }
}
