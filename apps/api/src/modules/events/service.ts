// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Service
// Multi-tenant business logic for event ingestion and query.
// Ingestion pipeline:
//   1. Check idempotency (return existing event if duplicate)
//   2. Resolve destinations for project/organization
//   3. Persist event + deliveries (PostgreSQL source of truth)
//   4. Publish delivery jobs to RabbitMQ
// ─────────────────────────────────────────────────────────────

import { Prisma } from '@zyvan/db';
import * as eventRepo from './repository';
import * as destRepo from '../destinations/repository';
import { publishDeliveryJob } from '../../lib/rabbitmq';
import { logger } from '../../lib/logger';

export interface IngestEventResult {
  event_id: string;
  status: string;
  created_at: string;
  duplicate: boolean;
}

/**
 * Ingest a new event into the system scoped to organization and project.
 */
export async function ingestEvent(
  organizationId: string,
  projectId: string,
  eventType: string,
  idempotencyKey: string,
  data: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<IngestEventResult> {
  // 1. Idempotency check — if the key already exists, return the existing event
  const existing = await eventRepo.findByIdempotencyKey(projectId, idempotencyKey);
  if (existing) {
    logger.info(
      { eventId: existing.id, idempotencyKey },
      'Duplicate idempotency key — returning existing event'
    );
    return {
      event_id: existing.id,
      status: existing.status,
      created_at: existing.createdAt.toISOString(),
      duplicate: true,
    };
  }

  // 2. Find active destinations for this project & organization
  const allDestinations = await destRepo.listByOrganization(organizationId, projectId);
  const activeDestinations = allDestinations.filter((d) => d.active);

  // 3. Persist event + delivery records in a single transaction
  let result: { event: any; deliveries: any[] };
  try {
    result = await eventRepo.createWithDeliveries(
      {
        organizationId,
        projectId,
        eventType,
        idempotencyKey,
        payload: data,
        headers,
      },
      activeDestinations.map((d) => d.id)
    );
  } catch (err: any) {
    // Handle concurrent request with the same idempotency key
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existingEvent = await eventRepo.findByIdempotencyKey(projectId, idempotencyKey);
      if (existingEvent) {
        return {
          event_id: existingEvent.id,
          status: existingEvent.status,
          created_at: existingEvent.createdAt.toISOString(),
          duplicate: true,
        };
      }
    }
    throw err;
  }

  // 4. Publish delivery jobs to RabbitMQ
  for (const delivery of result.deliveries) {
    try {
      publishDeliveryJob({
        deliveryId: delivery.id,
        eventId: result.event.id,
        destinationId: delivery.destinationId,
        attemptNo: 1,
      });
    } catch (err) {
      logger.error(
        { err, deliveryId: delivery.id, eventId: result.event.id },
        'Failed to publish delivery job — event is persisted and will be retried'
      );
    }
  }

  logger.info(
    {
      eventId: result.event.id,
      organizationId,
      projectId,
      deliveryCount: result.deliveries.length,
    },
    'Event ingested successfully'
  );

  return {
    event_id: result.event.id,
    status: result.event.status,
    created_at: result.event.createdAt.toISOString(),
    duplicate: false,
  };
}

/**
 * Get an event by ID with full delivery/attempt timeline.
 */
export async function getEvent(id: string, organizationId: string) {
  const event = await eventRepo.findById(id, organizationId);
  if (!event) return null;

  return {
    id: event.id,
    organizationId: event.organizationId,
    projectId: event.projectId,
    eventType: event.eventType,
    idempotencyKey: event.idempotencyKey,
    payload: event.payload,
    headers: event.headers,
    status: event.status,
    createdAt: event.createdAt,
    deliveries: event.deliveries.map((d) => ({
      id: d.id,
      destinationId: d.destinationId,
      destinationUrl: d.destination.url,
      status: d.status,
      attemptCount: d.attemptCount,
      lastStatusCode: d.lastStatusCode,
      nextRetryAt: d.nextRetryAt,
      createdAt: d.createdAt,
      attempts: d.attempts,
    })),
  };
}

/**
 * List events with filters and pagination scoped to organization.
 */
export async function listEvents(
  organizationId: string,
  projectId?: string,
  filters: {
    eventType?: string;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  } = {}
) {
  const { events, nextCursor } = await eventRepo.listWithFilters({
    organizationId,
    projectId,
    eventType: filters.eventType,
    status: filters.status as any,
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
    search: filters.search,
    cursor: filters.cursor,
    limit: filters.limit || 50,
  });

  return {
    data: events,
    pagination: {
      nextCursor,
      hasMore: nextCursor !== null,
    },
  };
}
