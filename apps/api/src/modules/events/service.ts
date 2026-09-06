// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Service
// Business logic for event ingestion, query, and lifecycle.
//
// Ingestion pipeline:
//   1. Resolve tenant by external_id
//   2. Check idempotency (return existing event if duplicate)
//   3. BEGIN TX → persist event + create deliveries → COMMIT
//   4. Publish delivery jobs to RabbitMQ
//   5. Return 202 Accepted
//
// PostgreSQL is ALWAYS the source of truth — events are persisted
// before any queue operations.
// ─────────────────────────────────────────────────────────────

import { Prisma } from '@prisma/client';
import * as eventRepo from './repository';
import * as tenantRepo from '../tenants/repository';
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
 * Ingest a new event into the system.
 *
 * This is the core ingestion pipeline:
 * 1. Validate tenant belongs to the project (by external ID)
 * 2. Check for duplicate idempotency key → return existing event
 * 3. Persist event + delivery records in a single transaction
 * 4. Publish delivery jobs to RabbitMQ for each active destination
 * 5. Return the event ID
 */
export async function ingestEvent(
  projectId: string,
  tenantExternalId: string,
  eventType: string,
  idempotencyKey: string,
  data: Record<string, unknown>,
  headers: Record<string, string>
): Promise<IngestEventResult> {
  // 1. Resolve tenant by external_id within this project
  const tenant = await tenantRepo.findByExternalId(tenantExternalId, projectId);
  if (!tenant) {
    const err = new Error(`Tenant with external_id '${tenantExternalId}' not found in this project`);
    (err as any).code = 'not_found';
    (err as any).statusCode = 404;
    throw err;
  }

  if (tenant.status !== 'active') {
    const err = new Error(`Tenant '${tenantExternalId}' is ${tenant.status}`);
    (err as any).code = 'conflict';
    (err as any).statusCode = 409;
    throw err;
  }

  // 2. Idempotency check — if the key already exists, return the existing event
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

  // 3. Find active destinations for this tenant
  const destinations = await destRepo.listByTenant(tenant.id);
  const activeDestinations = destinations.filter((d) => d.active);

  if (activeDestinations.length === 0) {
    const err = new Error('No active destinations for this tenant — cannot queue delivery');
    (err as any).code = 'conflict';
    (err as any).statusCode = 409;
    throw err;
  }

  // 4. Persist event + deliveries in a single transaction
  //    The DB UNIQUE constraint is the final dedup guard against concurrent requests
  let result: { event: any; deliveries: any[] };
  try {
    result = await eventRepo.createWithDeliveries(
      {
        projectId,
        tenantId: tenant.id,
        eventType,
        idempotencyKey,
        payload: data,
        headers,
      },
      activeDestinations.map((d) => d.id)
    );
  } catch (err: any) {
    // Handle race condition: concurrent request with the same idempotency key
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

  // 5. Publish delivery jobs to RabbitMQ
  //    This happens AFTER the transaction commits — if publishing fails,
  //    the event is already durable in PostgreSQL and can be recovered.
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
        'Failed to publish delivery job — event is persisted and can be retried'
      );
    }
  }

  logger.info(
    {
      eventId: result.event.id,
      tenantId: tenant.id,
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
export async function getEvent(id: string, projectId: string) {
  const event = await eventRepo.findById(id, projectId);
  if (!event) return null;

  return {
    id: event.id,
    projectId: event.projectId,
    tenantId: event.tenantId,
    eventType: event.eventType,
    idempotencyKey: event.idempotencyKey,
    payload: event.payload,
    headers: event.headers,
    status: event.status,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
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
 * List events with filters and cursor-based pagination.
 */
export async function listEvents(
  projectId: string,
  filters: {
    eventType?: string;
    tenantId?: string;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }
) {
  const { events, nextCursor } = await eventRepo.listWithFilters({
    projectId,
    eventType: filters.eventType,
    tenantId: filters.tenantId,
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
