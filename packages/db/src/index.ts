// ─────────────────────────────────────────────────────────────
// Zyvan Database Package
// Re-exports Prisma Client and all generated types
// ─────────────────────────────────────────────────────────────

export { PrismaClient } from '@prisma/client';
export type {
  User,
  ProjectMember,
  Project,
  ApiKey,
  Tenant,
  Destination,
  Event,
  Delivery,
  Attempt,
  Replay,
  DeadLetter,
  ProjectStatus,
  TenantStatus,
  EventStatus,
  DeliveryStatus,
  AttemptOutcome,
  ReplayStatus,
} from '@prisma/client';

import { PrismaClient } from '@prisma/client';

// Singleton Prisma client for the application
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
