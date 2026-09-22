// ─────────────────────────────────────────────────────────────
// Zyvan API — Delivery Repository
// Multi-tenant data access layer for the deliveries table.
// One Event → many Deliveries (one per destination).
// Scoped to organizationId.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import type { Delivery, DeliveryStatus } from '@zyvan/db';

/**
 * Find a delivery by ID scoped to organization.
 */
export async function findById(id: string, organizationId?: string): Promise<Delivery | null> {
  const prisma = getPrismaClient();
  return prisma.delivery.findFirst({
    where: {
      id,
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      event: { select: { id: true, projectId: true, organizationId: true, eventType: true, payload: true, headers: true } },
      destination: true,
    },
  });
}

/**
 * List all deliveries for an event.
 */
export async function listByEvent(eventId: string, organizationId?: string): Promise<Delivery[]> {
  const prisma = getPrismaClient();
  return prisma.delivery.findMany({
    where: {
      eventId,
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      destination: { select: { id: true, url: true, name: true } },
      attempts: {
        orderBy: { attemptNo: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * List deliveries for a destination with cursor-based pagination.
 * Scoped to organizationId.
 */
export async function listByDestination(
  destinationId: string,
  organizationId: string,
  cursor?: string,
  limit: number = 50
): Promise<{ deliveries: Delivery[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();
  const take = limit + 1;

  const deliveries = await prisma.delivery.findMany({
    where: {
      destinationId,
      organizationId,
    },
    include: {
      event: { select: { id: true, eventType: true, status: true, createdAt: true } },
      attempts: {
        orderBy: { attemptNo: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasNextPage = deliveries.length > limit;
  if (hasNextPage) deliveries.pop();

  return {
    deliveries,
    nextCursor: hasNextPage ? deliveries[deliveries.length - 1].id : null,
  };
}

/**
 * Update the status of a delivery.
 */
export async function updateStatus(
  id: string,
  status: DeliveryStatus,
  data?: { lastStatusCode?: number; nextRetryAt?: Date | null }
): Promise<Delivery> {
  const prisma = getPrismaClient();
  return prisma.delivery.update({
    where: { id },
    data: {
      status,
      ...(data?.lastStatusCode !== undefined ? { lastStatusCode: data.lastStatusCode } : {}),
      ...(data?.nextRetryAt !== undefined ? { nextRetryAt: data.nextRetryAt } : {}),
    },
  });
}

/**
 * Increment the attempt count for a delivery.
 */
export async function incrementAttemptCount(id: string): Promise<Delivery> {
  const prisma = getPrismaClient();
  return prisma.delivery.update({
    where: { id },
    data: {
      attemptCount: { increment: 1 },
    },
  });
}
