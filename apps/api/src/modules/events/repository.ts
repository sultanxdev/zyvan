// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Repository
// Multi-tenant data access layer for the events table.
// Idempotency is enforced via UNIQUE(project_id, idempotency_key).
// All records scoped to organizationId.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import type { Event, EventStatus, Delivery } from '@zyvan/db';

export interface CreateEventData {
  organizationId: string;
  projectId: string;
  eventType: string;
  idempotencyKey: string;
  payload: any;
  headers?: any;
}

export interface EventFilters {
  organizationId: string;
  projectId?: string;
  eventType?: string;
  status?: EventStatus;
  from?: Date;
  to?: Date;
  search?: string;
  cursor?: string;
  limit: number;
}

export interface EventWithDeliveries extends Event {
  deliveries: (Delivery & {
    destination: { id: string; url: string; name?: string };
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

export interface CreateEventResult {
  event: Event;
  deliveries: Delivery[];
  outboxMessages: OutboxMessage[];
}

/**
 * Create a new event with delivery records and transactional outbox messages in a single transaction.
 * Returns the created event, deliveries, and outbox messages.
 */
export async function createWithDeliveries(
  data: CreateEventData,
  destinationIds: string[]
): Promise<CreateEventResult> {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    // Insert event — UNIQUE constraint on (projectId, idempotencyKey)
    const event = await tx.event.create({
      data: {
        organizationId: data.organizationId,
        projectId: data.projectId,
        eventType: data.eventType,
        idempotencyKey: data.idempotencyKey,
        payload: data.payload,
        headers: data.headers || {},
        status: 'queued',
      },
    });

    // Create one Delivery and one OutboxMessage per destination with organizationId
    const deliveries: Delivery[] = [];
    const outboxMessages: OutboxMessage[] = [];
    for (const destId of destinationIds) {
      const delivery = await tx.delivery.create({
        data: {
          organizationId: data.organizationId,
          eventId: event.id,
          destinationId: destId,
          status: 'queued',
          attemptCount: 0,
        },
      });
      deliveries.push(delivery);

      const outbox = await tx.outboxMessage.create({
        data: {
          organizationId: data.organizationId,
          deliveryId: delivery.id,
        },
      });
      outboxMessages.push(outbox);
    }

    return { event, deliveries, outboxMessages };
  });
}

/**
 * Find an event by its idempotency key within a project.
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
 * Find an event by ID scoped to organization and project.
 */
export async function findById(
  id: string,
  organizationId: string
): Promise<EventWithDeliveries | null> {
  const prisma = getPrismaClient();
  return prisma.event.findFirst({
    where: { id, organizationId },
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
 * List events with cursor-based pagination and filters scoped to organization.
 */
export async function listWithFilters(filters: EventFilters): Promise<{ events: Event[]; nextCursor: string | null }> {
  const prisma = getPrismaClient();

  const where: any = { organizationId: filters.organizationId };
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.eventType) where.eventType = filters.eventType;
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

  const take = filters.limit + 1;

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  const hasNextPage = events.length > filters.limit;
  if (hasNextPage) events.pop();

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
