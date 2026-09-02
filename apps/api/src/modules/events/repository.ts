// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Repository
// Data access layer for the events table.
// Events are durably stored before acknowledgement.
// Idempotency is enforced via UNIQUE(project_id, idempotency_key).
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Event, EventStatus, Delivery } from '@zyvan/database';

export interface CreateEventData {
  projectId: string;
  tenantId: string;
  eventType: string;
  idempotencyKey: string;
  payload: any;
  headers: any;
}

export interface EventFilters {
  projectId: string;
  eventType?: string;
  tenantId?: string;
  status?: EventStatus;
  from?: Date;
  to?: Date;
  search?: string;
  cursor?: string;
  limit: number;
}

export interface EventWithDeliveries extends Event {
  deliveries: (Delivery & {
    destination: { id: string; url: string };
    attempts: Array<{
      id: string;
      attemptNo: number;
      startedAt: Date;
      endedAt: Date | null;
      statusCode: number | null;
      latencyMs: number | null;
      outcome: string;
      errorMessage: string | null;
    }>;
  })[];
}

/**
 * Create a new event with delivery records in a single transaction.
 * Returns the created event and deliveries.
 */
export async function createWithDeliveries(
  data: CreateEventData,
  destinationIds: string[]
): Promise<{ event: Event; deliveries: Delivery[] }> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    // Insert event — the UNIQUE constraint on (projectId, idempotencyKey)
    // will throw a Prisma P2002 error if a duplicate exists
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

    // Create one Delivery per active destination
    const deliveries: Delivery[] = [];
    for (const destId of destinationIds) {
      const delivery = await tx.delivery.create({
        data: {
          eventId: event.id,
          destinationId: destId,
          status: 'queued',
          attemptCount: 0,
        },
      });
      deliveries.push(delivery);
    }

    return { event, deliveries };
  });
}

/**
 * Find an event by its idempotency key within a project.
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
 * Find an event by ID with project ownership check.
 * Includes deliveries with attempts for the timeline view.
 */
export async function findById(
  id: string,
  projectId: string
): Promise<EventWithDeliveries | null> {
  const prisma = getPrismaClient();
  return prisma.event.findFirst({
    where: { id, projectId },
    include: {
      deliveries: {
        include: {
          destination: { select: { id: true, url: true } },
          attempts: {
            orderBy: { attemptNo: 'asc' },
            select: {
              id: true,
              attemptNo: true,
              startedAt: true,
              endedAt: true,
              statusCode: true,
              latencyMs: true,
              outcome: true,
              errorMessage: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  }) as unknown as EventWithDeliveries | null;
}

/**
 * List events with cursor-based pagination and filters.
 */
export async function listWithFilters(filters: EventFilters): Promise<{ events: Event[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();

  const where: any = { projectId: filters.projectId };
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.tenantId) where.tenantId = filters.tenantId;
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search } },
      { eventType: { contains: filters.search, mode: 'insensitive' } },
      { idempotencyKey: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const take = filters.limit + 1; // Fetch one extra to check if there's a next page

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  const hasNextPage = events.length > filters.limit;
  if (hasNextPage) events.pop(); // Remove the extra record

  return {
    events,
    nextCursor: hasNextPage ? events[events.length - 1].id : null,
  };
}

/**
 * Update the status of an event.
 */
export async function updateStatus(id: string, status: EventStatus): Promise<Event> {
  const prisma = getPrismaClient();
  return prisma.event.update({
    where: { id },
    data: { status },
  });
}
