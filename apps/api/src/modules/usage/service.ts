// ─────────────────────────────────────────────────────────────
// Zyvan API — Usage Service
// Computes aggregated usage metrics across events, deliveries,
// attempts, and DLQ for the authenticated project.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';

export interface UsageFilters {
  from?: Date;
  to?: Date;
}

export async function getProjectUsage(projectId: string, filters: UsageFilters = {}) {
  const prisma = getPrismaClient();

  const eventTimeFilter: any = {};
  if (filters.from) eventTimeFilter.gte = filters.from;
  if (filters.to) eventTimeFilter.lte = filters.to;

  const eventWhere: any = { projectId };
  if (filters.from || filters.to) {
    eventWhere.createdAt = eventTimeFilter;
  }

  // 1. Total events & breakdown by status
  const [totalEvents, eventsByStatusRaw] = await Promise.all([
    prisma.event.count({ where: eventWhere }),
    prisma.event.groupBy({
      by: ['status'],
      where: eventWhere,
      _count: { _all: true },
    }),
  ]);

  const eventsByStatus: Record<string, number> = {
    queued: 0,
    delivering: 0,
    retrying: 0,
    delivered: 0,
    dead_letter: 0,
    expired: 0,
    cancelled: 0,
  };

  for (const item of eventsByStatusRaw) {
    eventsByStatus[item.status] = item._count._all;
  }

  // 2. Deliveries total & breakdown by status
  const deliveryWhere: any = {
    event: { projectId },
  };
  if (filters.from || filters.to) {
    deliveryWhere.createdAt = eventTimeFilter;
  }

  const [totalDeliveries, deliveriesByStatusRaw] = await Promise.all([
    prisma.delivery.count({ where: deliveryWhere }),
    prisma.delivery.groupBy({
      by: ['status'],
      where: deliveryWhere,
      _count: { _all: true },
    }),
  ]);

  const deliveriesByStatus: Record<string, number> = {
    queued: 0,
    delivering: 0,
    retrying: 0,
    delivered: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const item of deliveriesByStatusRaw) {
    deliveriesByStatus[item.status] = item._count._all;
  }

  // 3. Attempt stats & average latency
  const attemptWhere: any = {
    delivery: {
      event: { projectId },
    },
  };
  if (filters.from || filters.to) {
    attemptWhere.startedAt = eventTimeFilter;
  }

  const [totalAttempts, attemptsByOutcomeRaw, latencyAgg] = await Promise.all([
    prisma.attempt.count({ where: attemptWhere }),
    prisma.attempt.groupBy({
      by: ['outcome'],
      where: attemptWhere,
      _count: { _all: true },
    }),
    prisma.attempt.aggregate({
      where: attemptWhere,
      _avg: { latencyMs: true },
    }),
  ]);

  const attemptsByOutcome: Record<string, number> = {
    success: 0,
    failed: 0,
    timeout: 0,
    error: 0,
  };

  for (const item of attemptsByOutcomeRaw) {
    attemptsByOutcome[item.outcome] = item._count._all;
  }

  // 4. DLQ count
  const dlqWhere: any = {
    event: { projectId },
  };
  if (filters.from || filters.to) {
    dlqWhere.createdAt = eventTimeFilter;
  }
  const deadLetterCount = await prisma.deadLetter.count({ where: dlqWhere });

  return {
    events: {
      total: totalEvents,
      byStatus: eventsByStatus,
    },
    deliveries: {
      total: totalDeliveries,
      byStatus: deliveriesByStatus,
    },
    attempts: {
      total: totalAttempts,
      byOutcome: attemptsByOutcome,
      averageLatencyMs: Math.round(latencyAgg._avg.latencyMs || 0),
    },
    deadLetters: {
      total: deadLetterCount,
    },
    period: {
      from: filters.from?.toISOString() || null,
      to: filters.to?.toISOString() || null,
    },
  };
}
