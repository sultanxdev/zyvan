// ─────────────────────────────────────────────────────────────
// Zyvan API — Delivery Repository
// Data access layer for the deliveries table.
// One Event → many Deliveries (one per destination).
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Delivery, DeliveryStatus } from '@zyvan/database';

/**
 * Find a delivery by ID.
 */
export async function findById(id: string): Promise<Delivery | null> {
  const prisma = getPrismaClient();
  return prisma.delivery.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, projectId: true, tenantId: true, eventType: true, payload: true, headers: true } },
      destination: true,
    },
  });
}

/**
 * List all deliveries for an event.
 */
export async function listByEvent(eventId: string): Promise<Delivery[]> {
  const prisma = getPrismaClient();
  return prisma.delivery.findMany({
    where: { eventId },
    include: {
      destination: { select: { id: true, url: true } },
      attempts: {
        orderBy: { attemptNo: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * List deliveries for a destination with cursor-based pagination.
 * Enforces project ownership via the destination → tenant → project chain.
 */
export async function listByDestination(
  destinationId: string,
  projectId: string,
  cursor?: string,
  limit: number = 50
): Promise<{ deliveries: Delivery[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();

  const take = limit + 1;

  const deliveries = await prisma.delivery.findMany({
    where: {
      destinationId,
      destination: {
        tenant: { projectId },
      },
    },
    include: {
      event: { select: { id: true, eventType: true, status: true, createdAt: true } },
      attempts: {
        orderBy: { attemptNo: 'desc' },
        take: 1, // Only the latest attempt for list view
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
export async function updateStatus(id: string, status: DeliveryStatus, data?: { lastStatusCode?: number; nextRetryAt?: Date | null }): Promise<Delivery> {
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
