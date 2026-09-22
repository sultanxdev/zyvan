// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Repository
// Data access layer for dead_letters table.
// Scoped to organizationId with deterministic cursor pagination
// and unified filtering for list and summary operations.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient, type Prisma, type DeadLetter, type DeadLetterStatus, type DeadLetterReason } from '@zyvan/db';
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

/**
 * Find an existing Replay record matching deadLetterId and idempotencyKey.
 */
export async function findReplayByIdempotencyKey(
  deadLetterId: string,
  idempotencyKey: string
) {
  const prisma = getPrismaClient();
  return prisma.replay.findUnique({
    where: {
      deadLetterId_idempotencyKey: {
        deadLetterId,
        idempotencyKey,
      },
    },
    include: {
      delivery: true,
    },
  });
}

/**
 * Find an existing ReplayBatch matching organizationId and idempotencyKey.
 */
export async function findReplayBatchByIdempotencyKey(
  organizationId: string,
  idempotencyKey: string
) {
  const prisma = getPrismaClient();
  return prisma.replayBatch.findUnique({
    where: {
      organizationId_idempotencyKey: {
        organizationId,
        idempotencyKey,
      },
    },
    include: {
      replays: {
        include: {
          delivery: true,
        },
      },
    },
  });
}

export interface ReplayCreationResult {
  status: 'created' | 'conflict' | 'not_found' | 'destination_inactive';
  replay?: any;
  delivery?: any;
  outbox?: any;
  currentStatus?: string;
}

/**
 * Atomically claim a dead letter (OPEN -> REPLAYING) and create new Delivery, Replay, and OutboxMessage
 * inside a single database transaction. If any creation fails, the entire transaction rolls back.
 */
export async function claimAndCreateReplayTransaction(params: {
  deadLetterId: string;
  organizationId: string;
  idempotencyKey: string;
  requestedBy?: string;
}): Promise<ReplayCreationResult> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    // 1. Fetch DeadLetter with destination to verify existence and destination active state
    const dl = await tx.deadLetter.findFirst({
      where: {
        id: params.deadLetterId,
        organizationId: params.organizationId,
      },
      include: {
        destination: {
          select: { id: true, active: true },
        },
      },
    });

    if (!dl) {
      return { status: 'not_found' };
    }

    if (dl.status !== 'open') {
      return { status: 'conflict', currentStatus: dl.status };
    }

    if (!dl.destination || !dl.destination.active) {
      return { status: 'destination_inactive' };
    }

    // 2. Atomic conditional claim: only transition if still open
    const claimCount = await tx.$executeRaw`
      UPDATE dead_letters
      SET status = 'replaying'::"DeadLetterStatus", replayed_at = NOW()
      WHERE id = ${params.deadLetterId}::uuid
        AND organization_id = ${params.organizationId}
        AND status = 'open'::"DeadLetterStatus"
    `;

    if (claimCount === 0) {
      return { status: 'conflict', currentStatus: dl.status };
    }

    // 3. Create new Delivery
    const delivery = await tx.delivery.create({
      data: {
        organizationId: params.organizationId,
        eventId: dl.eventId,
        destinationId: dl.destinationId,
        status: 'queued',
        attemptCount: 0,
      },
    });

    // 4. Create Replay record
    const replay = await tx.replay.create({
      data: {
        organizationId: params.organizationId,
        eventId: dl.eventId,
        deadLetterId: dl.id,
        originalDeliveryId: dl.deliveryId,
        deliveryId: delivery.id,
        idempotencyKey: params.idempotencyKey,
        requestedBy: params.requestedBy,
        status: 'queued',
      },
    });

    // 5. Create OutboxMessage
    const outbox = await tx.outboxMessage.create({
      data: {
        organizationId: params.organizationId,
        deliveryId: delivery.id,
      },
    });

    return {
      status: 'created',
      replay,
      delivery,
      outbox,
    };
  });
}

/**
 * Find candidate dead letters in OPEN status matching bulk replay criteria.
 */
export async function findOpenDeadLettersForBulkReplay(
  organizationId: string,
  filter: {
    destinationId?: string;
    reason?: DeadLetterReason;
    eventType?: string;
    from?: string;
    to?: string;
  },
  limit: number
) {
  const prisma = getPrismaClient();
  const where = buildDLQWhere(organizationId, {
    ...filter,
    status: 'open',
  });

  return prisma.deadLetter.findMany({
    where,
    include: {
      destination: {
        select: { id: true, active: true },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: Math.min(Math.max(limit, 1), 100),
  });
}

/**
 * Atomically create a ReplayBatch and execute claims + deliveries for all candidates in one transaction.
 */
export async function createBulkReplayTransaction(params: {
  organizationId: string;
  idempotencyKey: string;
  candidateIds: string[];
  requestedBy?: string;
}) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    // 1. Create ReplayBatch
    const batch = await tx.replayBatch.create({
      data: {
        organizationId: params.organizationId,
        idempotencyKey: params.idempotencyKey,
        requested: params.candidateIds.length,
        status: 'accepted',
      },
    });

    const replays: any[] = [];
    const deliveries: any[] = [];
    const outboxes: any[] = [];
    let accepted = 0;
    let skipped = 0;

    for (const deadLetterId of params.candidateIds) {
      const dl = await tx.deadLetter.findFirst({
        where: {
          id: deadLetterId,
          organizationId: params.organizationId,
        },
        include: {
          destination: { select: { active: true } },
        },
      });

      if (!dl || dl.status !== 'open' || !dl.destination?.active) {
        skipped++;
        continue;
      }

      const claimCount = await tx.$executeRaw`
        UPDATE dead_letters
        SET status = 'replaying'::"DeadLetterStatus", replayed_at = NOW()
        WHERE id = ${deadLetterId}::uuid
          AND organization_id = ${params.organizationId}
          AND status = 'open'::"DeadLetterStatus"
      `;

      if (claimCount === 0) {
        skipped++;
        continue;
      }

      const delivery = await tx.delivery.create({
        data: {
          organizationId: params.organizationId,
          eventId: dl.eventId,
          destinationId: dl.destinationId,
          status: 'queued',
          attemptCount: 0,
        },
      });

      const replay = await tx.replay.create({
        data: {
          organizationId: params.organizationId,
          eventId: dl.eventId,
          deadLetterId: dl.id,
          originalDeliveryId: dl.deliveryId,
          deliveryId: delivery.id,
          batchId: batch.id,
          idempotencyKey: `${params.idempotencyKey}:${dl.id}`,
          requestedBy: params.requestedBy,
          status: 'queued',
        },
      });

      const outbox = await tx.outboxMessage.create({
        data: {
          organizationId: params.organizationId,
          deliveryId: delivery.id,
        },
      });

      replays.push(replay);
      deliveries.push(delivery);
      outboxes.push(outbox);
      accepted++;
    }

    // Update batch totals
    const updatedBatch = await tx.replayBatch.update({
      where: { id: batch.id },
      data: {
        accepted,
        skipped,
      },
    });

    return {
      batch: updatedBatch,
      replays,
      deliveries,
      outboxes,
      accepted,
      skipped,
    };
  });
}

// ─── Manual Dismissal & Resolution Operations ──────────────────

export interface DLQMutationResult {
  status: 'updated' | 'already_terminal' | 'conflict' | 'not_found';
  currentStatus?: DeadLetterStatus;
  record?: DeadLetter;
}

export interface DLQBulkMutationResult {
  requested: number;
  affected: number;
  skipped: number;
  ids: string[];
}

/**
 * Atomically dismiss an open dead letter and create an audit log entry in a single transaction.
 * Concurrency primitive: UPDATE WHERE status = 'open'.
 */
export async function dismissDeadLetter(params: {
  id: string;
  organizationId: string;
  reason: string;
  dismissedBy: string;
  userId?: string | null;
  actorType?: string;
}): Promise<DLQMutationResult> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    // 1. Atomic conditional update
    const updated = await tx.$queryRaw<DeadLetter[]>`
      UPDATE dead_letters
      SET
        status = 'dismissed'::"DeadLetterStatus",
        dismissed_at = NOW(),
        dismissed_by = ${params.dismissedBy},
        dismissal_reason = ${params.reason}
      WHERE
        id = ${params.id}::uuid
        AND organization_id = ${params.organizationId}
        AND status = 'open'::"DeadLetterStatus"
      RETURNING *
    `;

    if (updated.length > 0) {
      // Record audit log
      await tx.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId || null,
          action: 'dead_letter.dismissed',
          resourceType: 'dead_letter',
          resourceId: params.id,
          metadata: {
            previousStatus: 'open',
            newStatus: 'dismissed',
            dismissalReason: params.reason,
            actorType: params.actorType || 'user',
            actorId: params.dismissedBy,
          },
        },
      });

      return { status: 'updated', record: updated[0] };
    }

    // 2. Handle zero rows updated: find existing record
    const existing = await tx.deadLetter.findFirst({
      where: {
        id: params.id,
        organizationId: params.organizationId,
      },
    });

    if (!existing) {
      return { status: 'not_found' };
    }

    if (existing.status === 'dismissed') {
      return { status: 'already_terminal', currentStatus: 'dismissed', record: existing };
    }

    return { status: 'conflict', currentStatus: existing.status };
  });
}

/**
 * Atomically manually resolve an open dead letter with an audit note in a single transaction.
 * Concurrency primitive: UPDATE WHERE status = 'open'.
 */
export async function resolveDeadLetter(params: {
  id: string;
  organizationId: string;
  resolution: string;
  resolvedBy: string;
  userId?: string | null;
  actorType?: string;
}): Promise<DLQMutationResult> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    // 1. Atomic conditional update
    const updated = await tx.$queryRaw<DeadLetter[]>`
      UPDATE dead_letters
      SET
        status = 'resolved'::"DeadLetterStatus",
        resolved_at = NOW(),
        resolved_by = ${params.resolvedBy},
        resolution = ${params.resolution}
      WHERE
        id = ${params.id}::uuid
        AND organization_id = ${params.organizationId}
        AND status = 'open'::"DeadLetterStatus"
      RETURNING *
    `;

    if (updated.length > 0) {
      // Record audit log
      await tx.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId || null,
          action: 'dead_letter.resolved',
          resourceType: 'dead_letter',
          resourceId: params.id,
          metadata: {
            previousStatus: 'open',
            newStatus: 'resolved',
            resolution: params.resolution,
            actorType: params.actorType || 'user',
            actorId: params.resolvedBy,
          },
        },
      });

      return { status: 'updated', record: updated[0] };
    }

    // 2. Handle zero rows updated: find existing record
    const existing = await tx.deadLetter.findFirst({
      where: {
        id: params.id,
        organizationId: params.organizationId,
      },
    });

    if (!existing) {
      return { status: 'not_found' };
    }

    if (existing.status === 'resolved') {
      return { status: 'already_terminal', currentStatus: 'resolved', record: existing };
    }

    return { status: 'conflict', currentStatus: existing.status };
  });
}

/**
 * Bulk dismiss candidate dead letters in an atomic transaction.
 * Only open dead letters belonging to organizationId are affected.
 */
export async function dismissBulkDeadLetters(params: {
  organizationId: string;
  candidateIds: string[];
  reason: string;
  dismissedBy: string;
  userId?: string | null;
  actorType?: string;
}): Promise<DLQBulkMutationResult> {
  if (params.candidateIds.length === 0) {
    return { requested: 0, affected: 0, skipped: 0, ids: [] };
  }

  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const affected = await tx.$queryRaw<{ id: string }[]>`
      UPDATE dead_letters
      SET
        status = 'dismissed'::"DeadLetterStatus",
        dismissed_at = NOW(),
        dismissed_by = ${params.dismissedBy},
        dismissal_reason = ${params.reason}
      WHERE
        id IN (${Prisma.join(params.candidateIds.map((id) => Prisma.sql`${id}::uuid`))})
        AND organization_id = ${params.organizationId}
        AND status = 'open'::"DeadLetterStatus"
      RETURNING id
    `;

    const affectedIds = affected.map((r) => r.id);

    if (affectedIds.length > 0) {
      await tx.auditLog.createMany({
        data: affectedIds.map((id) => ({
          organizationId: params.organizationId,
          userId: params.userId || null,
          action: 'dead_letter.dismissed',
          resourceType: 'dead_letter',
          resourceId: id,
          metadata: {
            mode: 'bulk',
            previousStatus: 'open',
            newStatus: 'dismissed',
            dismissalReason: params.reason,
            actorType: params.actorType || 'user',
            actorId: params.dismissedBy,
          },
        })),
      });
    }

    return {
      requested: params.candidateIds.length,
      affected: affectedIds.length,
      skipped: params.candidateIds.length - affectedIds.length,
      ids: affectedIds,
    };
  });
}

/**
 * Bulk manually resolve candidate dead letters in an atomic transaction.
 * Only open dead letters belonging to organizationId are affected.
 */
export async function resolveBulkDeadLetters(params: {
  organizationId: string;
  candidateIds: string[];
  resolution: string;
  resolvedBy: string;
  userId?: string | null;
  actorType?: string;
}): Promise<DLQBulkMutationResult> {
  if (params.candidateIds.length === 0) {
    return { requested: 0, affected: 0, skipped: 0, ids: [] };
  }

  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const affected = await tx.$queryRaw<{ id: string }[]>`
      UPDATE dead_letters
      SET
        status = 'resolved'::"DeadLetterStatus",
        resolved_at = NOW(),
        resolved_by = ${params.resolvedBy},
        resolution = ${params.resolution}
      WHERE
        id IN (${Prisma.join(params.candidateIds.map((id) => Prisma.sql`${id}::uuid`))})
        AND organization_id = ${params.organizationId}
        AND status = 'open'::"DeadLetterStatus"
      RETURNING id
    `;

    const affectedIds = affected.map((r) => r.id);

    if (affectedIds.length > 0) {
      await tx.auditLog.createMany({
        data: affectedIds.map((id) => ({
          organizationId: params.organizationId,
          userId: params.userId || null,
          action: 'dead_letter.resolved',
          resourceType: 'dead_letter',
          resourceId: id,
          metadata: {
            mode: 'bulk',
            previousStatus: 'open',
            newStatus: 'resolved',
            resolution: params.resolution,
            actorType: params.actorType || 'user',
            actorId: params.resolvedBy,
          },
        })),
      });
    }

    return {
      requested: params.candidateIds.length,
      affected: affectedIds.length,
      skipped: params.candidateIds.length - affectedIds.length,
      ids: affectedIds,
    };
  });
}

/**
 * Load open dead letters from an explicit list of IDs scoped to organizationId.
 */
export async function findOpenDeadLettersByIds(
  organizationId: string,
  ids: string[]
): Promise<DeadLetter[]> {
  if (ids.length === 0) return [];
  const prisma = getPrismaClient();
  return prisma.deadLetter.findMany({
    where: {
      organizationId,
      id: { in: ids },
      status: 'open',
    },
    take: 100,
  });
}

export const findOpenDeadLettersForBulk = findOpenDeadLettersForBulkReplay;
