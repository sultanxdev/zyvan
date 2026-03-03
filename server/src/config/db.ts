import { PrismaClient } from '@prisma/client';
import { config } from './env';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const db =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
    });

// Prevent multiple instances in dev (hot-reload safe)
if (config.isDev) globalForPrisma.prisma = db;
