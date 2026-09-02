// ─────────────────────────────────────────────────────────────
// Zyvan API — Delivery Repository
// Data access layer for the deliveries table.
// One Event → multiple Deliveries (one per Destination).
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Delivery, DeliveryStatus } from '@prisma/client';

/**
 * Find a delivery by ID.
 */
export async function findById(id: string): Promise<Delivery | null> {
  const prisma = getPrismaClient();
  return prisma.delivery.findUnique({
    where: { id },
  });
}

/**
 * List deliveries for a specific event.
 */
export async function listByEvent(eventId: string): Promise<Delivery[]> {
  const prisma = getPrismaClient();
  return prisma.delivery.findMany({
    where: { eventId },
    include: {
      destination: { select: { id: true, url: true, active: true } },
      attempts: {
        orderBy: { attemptNo: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * List deliveries for a specific destination (with cursor pagination).
 */
export async function listByDestination(
  destinationId: string,
  projectId: string,
  options: { cursor?: string; limit?: number }
): Promise<{ deliveries: any[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();
  const limit = options.limit || 50;

  const deliveries = await prisma.delivery.findMany({
    where: {
      destinationId,
      event: { projectId },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(options.cursor
      ? {
          cursor: { id: options.cursor },
          skip: 1,
        }
      : {}),
    include: {
      event: {
        select: { id: true, eventType: true, tenantId: true, status: true },
      },
      attempts: {
        orderBy: { attemptNo: 'desc' },
        take: 1, // Latest attempt only for list view
      },
    },
  });

  const hasNext = deliveries.length > limit;
  if (hasNext) deliveries.pop();

  return {
    deliveries,
    nextCursor: hasNext && deliveries.length > 0 ? deliveries[deliveries.length - 1].id : null,
  };
}

/**
 * Update delivery status and attempt metadata.
 */
export async function updateStatus(
  id: string,
  data: {
    status: DeliveryStatus;
    attemptCount?: number;
    lastStatusCode?: number | null;
    nextRetryAt?: Date | null;
  }
): Promise<Delivery> {
  const prisma = getPrismaClient();
  return prisma.delivery.update({
    where: { id },
    data,
  });
}

/**
 * Create a new delivery record (used by replay).
 */
export async function create(data: {
  eventId: string;
  destinationId: string;
  status?: DeliveryStatus;
}): Promise<Delivery> {
  const prisma = getPrismaClient();
  return prisma.delivery.create({
    data: {
      eventId: data.eventId,
      destinationId: data.destinationId,
      status: data.status || 'queued',
    },
  });
}
