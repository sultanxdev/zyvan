// ─────────────────────────────────────────────────────────────
// Zyvan Database Package — Prisma Client & Generated Types
// ─────────────────────────────────────────────────────────────

export { PrismaClient, Prisma } from '@prisma/client';
export type {
  User,
  Session,
  Account,
  Verification,
  Organization,
  Member,
  Invitation,
  Project,
  ApiKey,
  Destination,
  Event,
  Delivery,
  OutboxMessage,
  Attempt,
  Replay,
  DeadLetter,
  AuditLog,
  ProjectStatus,
  EventStatus,
  DeliveryStatus,
  AttemptOutcome,
  ReplayStatus,
} from '@prisma/client';

import { PrismaClient } from '@prisma/client';

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
