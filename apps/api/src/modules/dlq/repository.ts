// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Repository
// Data access layer for dead_letters table.
// When retry attempts are exhausted or a terminal error occurs,
// the delivery enters the DLQ with full attempt history preserved.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';

export interface DLQFilters {
  projectId: string;
  cursor?: string;
  limit: number;
}

/**
 * List dead letters for a project with cursor pagination.
 */
export async function listByProject(
  filters: DLQFilters
): Promise<{ deadLetters: any[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();
  const take = filters.limit + 1;

  const deadLetters = await prisma.deadLetter.findMany({
    where: {
      event: { projectId: filters.projectId },
    },
    include: {
      event: {
        select: {
          id: true,
          eventType: true,
          tenantId: true,
          status: true,
          createdAt: true,
          tenant: {
            select: { id: true, name: true, externalId: true },
          },
        },
      },
      delivery: {
        include: {
          destination: {
            select: { id: true, url: true },
          },
          attempts: {
            orderBy: { attemptNo: 'desc' },
            take: 1, // latest attempt summary
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  const hasNextPage = deadLetters.length > filters.limit;
  if (hasNextPage) deadLetters.pop();

  return {
    deadLetters,
    nextCursor: hasNextPage ? deadLetters[deadLetters.length - 1].id : null,
  };
}

/**
 * Find a specific dead letter entry by ID with project ownership check.
 * Includes complete event, destination, and attempt history.
 */
export async function findById(
  id: string,
  projectId: string
): Promise<any | null> {
  const prisma = getPrismaClient();

  return prisma.deadLetter.findFirst({
    where: {
      id,
      event: { projectId },
    },
    include: {
      event: {
        include: {
          tenant: {
            select: { id: true, name: true, externalId: true },
          },
        },
      },
      delivery: {
        include: {
          destination: {
            select: { id: true, url: true, retryPolicy: true, rateLimit: true },
          },
          attempts: {
            orderBy: { attemptNo: 'asc' },
          },
        },
      },
    },
  });
}

/**
 * Count dead letters for a project.
 */
export async function countByProject(projectId: string): Promise<number> {
  const prisma = getPrismaClient();
  return prisma.deadLetter.count({
    where: {
      event: { projectId },
    },
  });
}
