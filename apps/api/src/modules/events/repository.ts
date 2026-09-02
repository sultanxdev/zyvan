// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Repository
// Data access layer for the events table.
// Events are the heart of Zyvan — durably stored before ack.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Event, EventStatus, Prisma } from '@prisma/client';

/**
 * Create an event and its delivery records in a single transaction.
 * This is the critical transaction — PostgreSQL COMMIT = durable acceptance.
 *
 * @returns The created event with delivery records
 */
export async function createWithDeliveries(
  data: {
    projectId: string;
    tenantId: string;
    eventType: string;
    idempotencyKey: string;
    payload: any;
    headers: any;
  },
  destinationIds: string[]
): Promise<Event & { deliveries: { id: string; destinationId: string }[] }> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    // 1. Insert the event
    const event = await tx.event.create({
      data: {
        projectId: data.projectId,
        tenantId: data.tenantId,
        eventType: data.eventType,
        idempotencyKey: data.idempotencyKey,
        payload: data.payload,
        headers: data.headers,
        status: 'queued',
      },
    });

    // 2. Create delivery records — one per destination
    const deliveries: { id: string; destinationId: string }[] = [];
    for (const destId of destinationIds) {
      const delivery = await tx.delivery.create({
        data: {
          eventId: event.id,
          destinationId: destId,
          status: 'queued',
        },
      });
      deliveries.push({ id: delivery.id, destinationId: destId });
    }

    return { ...event, deliveries };
  });
}

/**
 * Find an existing event by project + idempotency key.
 * Used for duplicate detection.
 */
export async function findByIdempotencyKey(
  projectId: string,
  idempotencyKey: string
): Promise<Event | null> {
  const prisma = getPrismaClient();
  return prisma.event.findUnique({
    where: {
      projectId_idempotencyKey: {
        projectId,
        idempotencyKey,
      },
    },
  });
}

/**
 * Find an event by ID with full delivery + attempt timeline.
 */
export async function findByIdWithTimeline(
  id: string,
  projectId: string
): Promise<any | null> {
  const prisma = getPrismaClient();
  return prisma.event.findFirst({
    where: { id, projectId },
    include: {
      tenant: { select: { id: true, name: true, externalId: true } },
      deliveries: {
        include: {
          destination: { select: { id: true, url: true, active: true } },
          attempts: {
            orderBy: { attemptNo: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      replays: {
        orderBy: { createdAt: 'desc' },
      },
      deadLetters: true,
    },
  });
}

/**
 * List events with cursor pagination and filters.
 */
export async function listWithFilters(
  projectId: string,
  filters: {
    eventType?: string;
    tenantId?: string;
    status?: EventStatus;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }
): Promise<{ events: Event[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();
  const limit = filters.limit || 50;

  const where: Prisma.EventWhereInput = {
    projectId,
    ...(filters.eventType && { eventType: filters.eventType }),
    ...(filters.tenantId && { tenantId: filters.tenantId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from && { gte: new Date(filters.from) }),
            ...(filters.to && { lte: new Date(filters.to) }),
          },
        }
      : {}),
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Fetch one extra to determine if there's a next page
    ...(filters.cursor
      ? {
          cursor: { id: filters.cursor },
          skip: 1, // Skip the cursor itself
        }
      : {}),
    include: {
      tenant: { select: { id: true, name: true, externalId: true } },
      deliveries: {
        select: { id: true, status: true, destinationId: true },
      },
    },
  });

  const hasNext = events.length > limit;
  if (hasNext) events.pop(); // Remove the extra item

  return {
    events,
    nextCursor: hasNext && events.length > 0 ? events[events.length - 1].id : null,
  };
}

/**
 * Update event status.
 */
export async function updateStatus(id: string, status: EventStatus): Promise<Event> {
  const prisma = getPrismaClient();
  return prisma.event.update({
    where: { id },
    data: { status },
  });
}
