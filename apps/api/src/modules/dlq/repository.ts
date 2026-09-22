// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Repository
// Data access layer for dead_letters table.
// Scoped to organizationId.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';

export interface DLQFilters {
  organizationId: string;
  projectId?: string;
  cursor?: string;
  limit: number;
}

/**
 * List dead letters for an organization with cursor pagination.
 */
export async function listByOrganization(
  filters: DLQFilters
): Promise<{ deadLetters: any[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();
  const take = filters.limit + 1;

  const deadLetters = await prisma.deadLetter.findMany({
    where: {
      event: {
        organizationId: filters.organizationId,
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
      },
    },
    include: {
      event: {
        select: {
          id: true,
          eventType: true,
          status: true,
          createdAt: true,
          project: {
            select: { id: true, name: true },
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
            take: 1,
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
 * Find a specific dead letter entry by ID with organization boundary check.
 */
export async function findById(
  id: string,
  organizationId: string
): Promise<any | null> {
  const prisma = getPrismaClient();

  return prisma.deadLetter.findFirst({
    where: {
      id,
      event: { organizationId },
    },
    include: {
      event: {
        include: {
          project: {
            select: { id: true, name: true },
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
 * Count dead letters for an organization.
 */
export async function countByOrganization(organizationId: string, projectId?: string): Promise<number> {
  const prisma = getPrismaClient();
  return prisma.deadLetter.count({
    where: {
      event: {
        organizationId,
        ...(projectId ? { projectId } : {}),
      },
    },
  });
}
