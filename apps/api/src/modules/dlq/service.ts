// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Service
// Business logic for DLQ operational triage, metrics summary,
// and detail retrieval.
// ─────────────────────────────────────────────────────────────

import * as dlqRepo from './repository';
import { getPrismaClient } from '@zyvan/db';
import { publishDeliveryJobsConfirmed } from '../../lib/rabbitmq';
import { logger } from '../../lib/logger';
import { createAppError } from '../../middleware/error-handler';
import type { DLQFilterInput, DLQSummaryFilterInput, ReplayBulkInput } from '@zyvan/validation';

/**
 * List dead letters for an organization with cursor pagination.
 */
export async function listDeadLetters(
  organizationId: string,
  filters: DLQFilterInput
) {
  const result = await dlqRepo.listByOrganization(organizationId, filters);

  return {
    data: result.deadLetters.map((dl) => ({
      id: dl.id,
      organizationId: dl.organizationId,
      eventId: dl.eventId,
      deliveryId: dl.deliveryId,
      destinationId: dl.destinationId,
      status: dl.status,
      reason: dl.reason,
      errorMessage: dl.errorMessage,
      statusCode: dl.statusCode,
      attemptCount: dl.attemptCount,
      replayedAt: dl.replayedAt,
      resolvedAt: dl.resolvedAt,
      resolvedBy: dl.resolvedBy,
      dismissedAt: dl.dismissedAt,
      dismissedBy: dl.dismissedBy,
      resolution: dl.resolution,
      createdAt: dl.createdAt,
      event: {
        id: dl.event.id,
        eventType: dl.event.eventType,
        project: dl.event.project,
        status: dl.event.status,
        createdAt: dl.event.createdAt,
      },
      destination: dl.destination,
      delivery: {
        id: dl.delivery.id,
        status: dl.delivery.status,
        attemptCount: dl.delivery.attemptCount,
        lastStatusCode: dl.delivery.lastStatusCode,
        latestAttempt: dl.delivery.attempts[0] || null,
      },
    })),
    pagination: {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    },
  };
}

/**
 * Get aggregated summary metrics for DLQ operational triage.
 */
export async function getDLQSummary(
  organizationId: string,
  filters: DLQSummaryFilterInput
) {
  return dlqRepo.getSummary(organizationId, filters);
}

/**
 * Get detailed dead-letter entry with full attempt timeline and destination details.
 */
export async function getDeadLetter(id: string, organizationId: string) {
  const dl = await dlqRepo.findById(id, organizationId);
  if (!dl) return null;

  return {
    id: dl.id,
    organizationId: dl.organizationId,
    eventId: dl.eventId,
    deliveryId: dl.deliveryId,
    destinationId: dl.destinationId,
    status: dl.status,
    reason: dl.reason,
    errorMessage: dl.errorMessage,
    statusCode: dl.statusCode,
    attemptCount: dl.attemptCount,
    replayedAt: dl.replayedAt,
    resolvedAt: dl.resolvedAt,
    resolvedBy: dl.resolvedBy,
    dismissedAt: dl.dismissedAt,
    dismissedBy: dl.dismissedBy,
    resolution: dl.resolution,
    createdAt: dl.createdAt,
    event: {
      id: dl.event.id,
      eventType: dl.event.eventType,
      idempotencyKey: dl.event.idempotencyKey,
      payload: dl.event.payload,
      headers: dl.event.headers,
      status: dl.event.status,
      project: dl.event.project,
      createdAt: dl.event.createdAt,
    },
    destination: dl.destination,
    delivery: {
      id: dl.delivery.id,
      status: dl.delivery.status,
      attemptCount: dl.delivery.attemptCount,
      lastStatusCode: dl.delivery.lastStatusCode,
      attempts: dl.delivery.attempts,
    },
  };
}

/**
 * Replay a single dead letter.
 * Enforces:
 * 1. Idempotency via (deadLetterId, idempotencyKey).
 * 2. Atomic claim + creation transaction (OPEN -> REPLAYING + new Delivery + Replay + Outbox).
 * 3. Race condition recovery on P2002.
 * 4. Confirmed publish to RabbitMQ with outbox durability during broker outages.
 */
export async function replayDeadLetter(
  id: string,
  organizationId: string,
  idempotencyKey: string,
  requestedBy?: string
) {
  // 1. Check if Replay with this (deadLetterId, idempotencyKey) already exists
  const existing = await dlqRepo.findReplayByIdempotencyKey(id, idempotencyKey);
  if (existing) {
    return {
      status: 'existing',
      replayId: existing.id,
      deliveryId: existing.deliveryId,
      deadLetterId: existing.deadLetterId,
      replayStatus: existing.status,
      createdAt: existing.createdAt,
    };
  }

  // 2. Execute atomic claim and creation transaction
  let result: dlqRepo.ReplayCreationResult;
  try {
    result = await dlqRepo.claimAndCreateReplayTransaction({
      deadLetterId: id,
      organizationId,
      idempotencyKey,
      requestedBy,
    });
  } catch (err: any) {
    // P2002 unique constraint race recovery
    if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
      const recovered = await dlqRepo.findReplayByIdempotencyKey(id, idempotencyKey);
      if (recovered) {
        return {
          status: 'existing',
          replayId: recovered.id,
          deliveryId: recovered.deliveryId,
          deadLetterId: recovered.deadLetterId,
          replayStatus: recovered.status,
          createdAt: recovered.createdAt,
        };
      }
    }
    throw err;
  }

  if (result.status === 'not_found') {
    throw createAppError('not_found', 'Dead letter record not found in this organization');
  }

  if (result.status === 'conflict') {
    throw createAppError(
      'conflict',
      `Cannot replay dead letter in status '${result.currentStatus}'. Only 'open' dead letters can be replayed.`,
      { status: result.currentStatus }
    );
  }

  if (result.status === 'destination_inactive') {
    throw createAppError(
      'invalid_request',
      'Cannot replay dead letter: destination is inactive or disabled'
    );
  }

  // 3. Broker publish with confirm; durability maintained via outbox on failure
  const prisma = getPrismaClient();
  try {
    const { confirmed } = await publishDeliveryJobsConfirmed([
      {
        deliveryId: result.delivery!.id,
        attemptNo: 1,
      },
    ]);

    if (confirmed.length > 0) {
      await prisma.outboxMessage.deleteMany({
        where: { deliveryId: { in: confirmed } },
      });
      logger.debug(
        { deliveryId: result.delivery!.id, replayId: result.replay!.id },
        'Replayed delivery job published confirmed and removed from outbox'
      );
    }
  } catch (err) {
    // RabbitMQ is down — outbox message remains in DB.
    // Reconciler will pick it up when broker recovers.
    logger.warn(
      { err, deliveryId: result.delivery!.id, replayId: result.replay!.id },
      'RabbitMQ publish failed during DLQ replay — delivery preserved in outbox'
    );
  }

  return {
    status: 'created',
    replayId: result.replay!.id,
    deliveryId: result.delivery!.id,
    deadLetterId: id,
    replayStatus: result.replay!.status,
    createdAt: result.replay!.createdAt,
  };
}

/**
 * Bulk replay dead letters matching filter criteria.
 * Enforces:
 * 1. Bulk operation idempotency via ReplayBatch (organizationId, idempotencyKey).
 * 2. Capped at limit (max 100).
 * 3. Atomic claim + creation transaction for all candidates.
 * 4. Confirmed publish to RabbitMQ with outbox durability during broker outages.
 */
export async function replayBulk(
  organizationId: string,
  input: ReplayBulkInput,
  idempotencyKey: string,
  requestedBy?: string
) {
  // 1. Check if ReplayBatch with (organizationId, idempotencyKey) already exists
  const existingBatch = await dlqRepo.findReplayBatchByIdempotencyKey(organizationId, idempotencyKey);
  if (existingBatch) {
    return {
      status: 'existing',
      batchId: existingBatch.id,
      requested: existingBatch.requested,
      accepted: existingBatch.accepted,
      skipped: existingBatch.skipped,
      batchStatus: existingBatch.status,
      replays: existingBatch.replays.map((r) => ({
        replayId: r.id,
        deliveryId: r.deliveryId,
        deadLetterId: r.deadLetterId,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  // 2. Find candidate open dead letters matching filters (capped at limit or 100)
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 100);
  const candidates = await dlqRepo.findOpenDeadLettersForBulkReplay(
    organizationId,
    {
      destinationId: input.filter?.destinationId,
      reason: input.filter?.reason as any,
      eventType: input.filter?.eventType,
      from: input.filter?.from,
      to: input.filter?.to,
    },
    limit
  );

  const candidateIds = candidates.map((c) => c.id);

  // 3. Atomically create ReplayBatch + Replays + Deliveries + Outbox in one transaction
  let result: Awaited<ReturnType<typeof dlqRepo.createBulkReplayTransaction>>;
  try {
    result = await dlqRepo.createBulkReplayTransaction({
      organizationId,
      idempotencyKey,
      candidateIds,
      requestedBy,
    });
  } catch (err: any) {
    if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
      const recoveredBatch = await dlqRepo.findReplayBatchByIdempotencyKey(organizationId, idempotencyKey);
      if (recoveredBatch) {
        return {
          status: 'existing',
          batchId: recoveredBatch.id,
          requested: recoveredBatch.requested,
          accepted: recoveredBatch.accepted,
          skipped: recoveredBatch.skipped,
          batchStatus: recoveredBatch.status,
          replays: recoveredBatch.replays.map((r) => ({
            replayId: r.id,
            deliveryId: r.deliveryId,
            deadLetterId: r.deadLetterId,
            status: r.status,
            createdAt: r.createdAt,
          })),
        };
      }
    }
    throw err;
  }

  // 4. Broker publish with confirm for accepted deliveries; outbox retains unconfirmed
  if (result.deliveries.length > 0) {
    const jobs = result.deliveries.map((d: any) => ({
      deliveryId: d.id,
      attemptNo: 1,
    }));

    const prisma = getPrismaClient();
    try {
      const { confirmed } = await publishDeliveryJobsConfirmed(jobs);
      if (confirmed.length > 0) {
        await prisma.outboxMessage.deleteMany({
          where: { deliveryId: { in: confirmed } },
        });
        logger.debug(
          { confirmedCount: confirmed.length, batchId: result.batch.id },
          'Bulk replayed delivery jobs published confirmed and removed from outbox'
        );
      }
    } catch (err) {
      logger.warn(
        { err, batchId: result.batch.id },
        'RabbitMQ publish failed during bulk replay — deliveries preserved in outbox'
      );
    }
  }

  return {
    status: 'created',
    batchId: result.batch.id,
    requested: result.batch.requested,
    accepted: result.batch.accepted,
    skipped: result.batch.skipped,
    batchStatus: result.batch.status,
    replays: result.replays.map((r: any) => ({
      replayId: r.id,
      deliveryId: r.deliveryId,
      deadLetterId: r.deadLetterId,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}
