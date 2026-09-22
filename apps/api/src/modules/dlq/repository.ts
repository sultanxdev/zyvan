// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Repository
// Data access layer for dead_letters table.
// Scoped to organizationId with deterministic cursor pagination
// and unified filtering for list and summary operations.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient, type Prisma, type DeadLetterStatus, type DeadLetterReason } from '@zyvan/db';
import type { DLQFilterInput, DLQSummaryFilterInput } from '@zyvan/validation';

export interface DLQCursor {
  createdAt: string; // ISO-8601 string
  id: string;        // UUID
}

/**
 * Encode a composite cursor ({ createdAt, id }) to a URL-safe base64 string.
 */
export function encodeCursor(createdAt: Date, id: string): string {
  const payload: DLQCursor = {
    createdAt: createdAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decode a URL-safe base64 string into a composite cursor ({ createdAt, id }).
 * Returns null if the cursor is malformed or invalid.
 */
export function decodeCursor(cursorStr: string): DLQCursor | null {
  try {
    const raw = Buffer.from(cursorStr, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.createdAt === 'string' &&
      !isNaN(Date.parse(parsed.createdAt)) &&
      typeof parsed.id === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Unified WHERE builder for DeadLetter queries.
 * Shared between listByOrganization and getSummary so metrics and list results never diverge.
 */
export function buildDLQWhere(
  organizationId: string,
  filters: DLQFilterInput | DLQSummaryFilterInput
): Prisma.DeadLetterWhereInput {
  const where: Prisma.DeadLetterWhereInput = {
    organizationId,
  };

  if (filters.status) {
    where.status = filters.status as DeadLetterStatus;
  }

  if (filters.reason) {
    where.reason = filters.reason as DeadLetterReason;
  }

  if (filters.destinationId) {
    where.destinationId = filters.destinationId;
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      where.createdAt.gte = new Date(filters.from);
    }
    if (filters.to) {
      where.createdAt.lte = new Date(filters.to);
    }
  }

  // Event conditions: projectId, eventType, search
  const eventConditions: Prisma.EventWhereInput = {};
  let hasEventConditions = false;

  if (filters.projectId) {
    eventConditions.projectId = filters.projectId;
    hasEventConditions = true;
  }

  if (filters.eventType) {
    eventConditions.eventType = filters.eventType;
    hasEventConditions = true;
  }

  if (filters.search) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.search);
    if (isUuid) {
      eventConditions.OR = [
        { id: filters.search },
        { idempotencyKey: filters.search },
      ];
    } else {
      eventConditions.idempotencyKey = { contains: filters.search, mode: 'insensitive' };
    }
    hasEventConditions = true;
  }

  if (hasEventConditions) {
    where.event = eventConditions;
  }

  return where;
}

/**
 * List dead letters for an organization with composite cursor pagination (createdAt DESC, id DESC).
 */
export async function listByOrganization(
  organizationId: string,
  filters: DLQFilterInput
): Promise<{ deadLetters: any[]; nextCursor: string | null; hasMore: boolean }> {
  const prisma = getPrismaClient();
  const limit = filters.limit || 50;
  const take = limit + 1;

  const where = buildDLQWhere(organizationId, filters);

  if (filters.cursor) {
    const decoded = decodeCursor(filters.cursor);
    if (decoded) {
      const cursorDate = new Date(decoded.createdAt);
      const cursorId = decoded.id;

      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: cursorId },
            },
          ],
        },
      ];
    }
  }

  const deadLetters = await prisma.deadLetter.findMany({
    where,
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
      destination: {
        select: {
          id: true,
          url: true,
        },
      },
      delivery: {
        select: {
          id: true,
          status: true,
          attemptCount: true,
          lastStatusCode: true,
          attempts: {
            orderBy: { attemptNo: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take,
  });

  const hasMore = deadLetters.length > limit;
  if (hasMore) {
    deadLetters.pop();
  }

  const lastItem = deadLetters.length > 0 ? deadLetters[deadLetters.length - 1] : null;
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  return {
    deadLetters,
    nextCursor,
    hasMore,
  };
}

export interface DLQSummaryResult {
  total: number;
  byStatus: Record<DeadLetterStatus, number>;
  byReason: Record<DeadLetterReason, number>;
  topDestinations: Array<{
    destinationId: string;
    destinationUrl: string | null;
    count: number;
  }>;
}

/**
 * Get summary aggregation metrics for DLQ operational triage.
 */
export async function getSummary(
  organizationId: string,
  filters: DLQSummaryFilterInput
): Promise<DLQSummaryResult> {
  const prisma = getPrismaClient();
  const where = buildDLQWhere(organizationId, filters);

  const [total, statusCounts, reasonCounts, topDestGroups] = await Promise.all([
    prisma.deadLetter.count({ where }),
    prisma.deadLetter.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    prisma.deadLetter.groupBy({
      by: ['reason'],
      where,
      _count: { id: true },
    }),
    prisma.deadLetter.groupBy({
      by: ['destinationId'],
      where,
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 20,
    }),
  ]);

  const byStatus: Record<DeadLetterStatus, number> = {
    open: 0,
    replaying: 0,
    resolved: 0,
    dismissed: 0,
  };
  for (const sc of statusCounts) {
    byStatus[sc.status] = sc._count.id;
  }

  const byReason: Record<DeadLetterReason, number> = {
    terminal_4xx: 0,
    retries_exhausted: 0,
    ssrf_blocked: 0,
    timeout: 0,
    other: 0,
  };
  for (const rc of reasonCounts) {
    byReason[rc.reason] = rc._count.id;
  }

  // Stable deterministic sorting for ties: count DESC, destinationId ASC
  const sortedDestGroups = topDestGroups
    .sort((a, b) => {
      const diff = b._count.id - a._count.id;
      if (diff !== 0) return diff;
      return a.destinationId.localeCompare(b.destinationId);
    })
    .slice(0, 5);

  const destIds = sortedDestGroups.map((g) => g.destinationId);
  const destinations = destIds.length > 0
    ? await prisma.destination.findMany({
        where: { id: { in: destIds } },
        select: { id: true, url: true },
      })
    : [];

  const destMap = new Map(destinations.map((d) => [d.id, d.url]));

  const topDestinations = sortedDestGroups.map((g) => ({
    destinationId: g.destinationId,
    destinationUrl: destMap.get(g.destinationId) || null,
    count: g._count.id,
  }));

  return {
    total,
    byStatus,
    byReason,
    topDestinations,
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
      organizationId,
    },
    include: {
      event: {
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
      },
      destination: {
        select: {
          id: true,
          url: true,
          retryPolicy: true,
          rateLimit: true,
        },
      },
      delivery: {
        include: {
          attempts: {
            orderBy: { attemptNo: 'asc' },
          },
        },
      },
    },
  });
}
