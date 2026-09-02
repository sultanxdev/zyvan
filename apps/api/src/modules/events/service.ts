// ─────────────────────────────────────────────────────────────
// Zyvan API — Event Service
// Core event ingestion logic.
//
// Flow: validate → check idempotency → BEGIN TX →
//       insert event + create deliveries → COMMIT →
//       publish to RabbitMQ → return 202
//
// Critical invariant:
//   Never acknowledge durable acceptance before PostgreSQL
//   has successfully committed the event.
// ─────────────────────────────────────────────────────────────

import * as eventRepo from './repository';
import * as tenantRepo from '../tenants/repository';
import { publishDeliveryJob, isRabbitMQConnected } from '../../lib/rabbitmq';
import { getPrismaClient } from '@zyvan/database';
import { logger } from '../../lib/logger';
import type { EventStatus } from '@prisma/client';

/**
 * Ingest a new event.
 *
 * 1. Validate tenant exists and belongs to project
 * 2. Check idempotency — return existing event if duplicate
 * 3. Find active destinations for the tenant
 * 4. BEGIN TX: insert event + create delivery records → COMMIT
 * 5. Publish delivery jobs to RabbitMQ
 * 6. Return 202 Accepted
 */
export async function createEvent(
  projectId: string,
  data: {
    type: string;
    tenant_id: string;
    idempotency_key: string;
    data: Record<string, unknown>;
    headers: Record<string, string>;
  }
): Promise<{ event: any; duplicate: boolean }> {
  // 1. Validate tenant belongs to this project
  const tenant = await tenantRepo.findByExternalId(data.tenant_id, projectId);
  if (!tenant) {
    const err = new Error(`Tenant '${data.tenant_id}' not found in this project`);
    (err as any).code = 'not_found';
    (err as any).statusCode = 404;
    throw err;
  }

  // Check tenant status
  if (tenant.status !== 'active') {
    const err = new Error(`Tenant '${data.tenant_id}' is ${tenant.status}`);
    (err as any).code = 'conflict';
    (err as any).statusCode = 409;
    throw err;
  }

  // 2. Idempotency check — return existing event if same key
  const existing = await eventRepo.findByIdempotencyKey(projectId, data.idempotency_key);
  if (existing) {
    logger.info(
      { eventId: existing.id, idempotencyKey: data.idempotency_key },
      'Duplicate idempotency key — returning existing event'
    );
    return { event: existing, duplicate: true };
  }

  // 3. Find active destinations for this tenant
  const prisma = getPrismaClient();
  const destinations = await prisma.destination.findMany({
    where: {
      tenantId: tenant.id,
      active: true,
    },
    select: { id: true },
  });

  if (destinations.length === 0) {
    const err = new Error('No active destinations configured for this tenant');
    (err as any).code = 'invalid_request';
    (err as any).statusCode = 400;
    throw err;
  }

  // 4. Transactional creation — event + deliveries in one TX
  //    PostgreSQL COMMIT = durable acceptance
  const result = await eventRepo.createWithDeliveries(
    {
      projectId,
      tenantId: tenant.id,
      eventType: data.type,
      idempotencyKey: data.idempotency_key,
      payload: data.data,
      headers: data.headers,
    },
    destinations.map((d) => d.id)
  );

  // 5. Publish delivery jobs to RabbitMQ
  //    If RabbitMQ is down, the event is still safely in PostgreSQL.
  //    A recovery process can re-enqueue later.
  if (isRabbitMQConnected()) {
    for (const delivery of result.deliveries) {
      try {
        publishDeliveryJob(delivery.id, result.id);
      } catch (err) {
        logger.error(
          { err, deliveryId: delivery.id, eventId: result.id },
          'Failed to publish delivery job — will be recovered'
        );
      }
    }
  } else {
    logger.warn(
      { eventId: result.id },
      'RabbitMQ not connected — deliveries will be recovered by reconciliation'
    );
  }

  logger.info(
    {
      eventId: result.id,
      tenantId: tenant.id,
      eventType: data.type,
      deliveryCount: result.deliveries.length,
    },
    'Event ingested and delivery jobs queued'
  );

  return { event: result, duplicate: false };
}

/**
 * Get a single event with full delivery timeline.
 */
export async function getEvent(id: string, projectId: string): Promise<any | null> {
  return eventRepo.findByIdWithTimeline(id, projectId);
}

/**
 * List events with filters and cursor pagination.
 */
export async function listEvents(
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
) {
  return eventRepo.listWithFilters(projectId, filters);
}
