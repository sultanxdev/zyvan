// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Delivery Service
//
// The core delivery state machine:
//   1. Load delivery from PostgreSQL (system of record)
//   2. Validate attemptNo for stale-job protection
//   3. Handle PROCESSING -> RETRYING crash window recovery
//   4. Atomic claim with 60s lease (HTTP_TIMEOUT_MS * 4)
//   5. Record immutable attempt
//   6. Classify result: Success / Tiered Retry / Authoritative DLQ
//   7. DB-first retry transition + confirmed retry publish before ACK
// ─────────────────────────────────────────────────────────────

import { getPrismaClient, type DeadLetterReason } from '@zyvan/db';
import { sendWebhook } from './http-client';
import { createAttempt, completeAttempt } from './attempt-service';
import {
  classifyFailure,
  getRetryTier,
  MAX_RETRY_ATTEMPTS,
  parseRetryPolicy,
} from './retry-service';
import { publishTieredRetryJobConfirmed } from '../lib/rabbitmq';
import {
  acquireSlotLease,
  releaseSlotLease,
  DEFAULT_CONCURRENCY_LIMIT,
} from './destination-concurrency';
import { checkRateLimit } from './destination-rate-limiter';
import type { DeliveryJobMessage } from '@zyvan/queue';

export type { DeliveryJobMessage as DeliveryJob };

export interface DeliveryForDLQ {
  id: string;
  organizationId: string;
  eventId: string;
  destinationId: string;
}

export interface MoveToDLQParams {
  delivery: DeliveryForDLQ;
  reason: DeadLetterReason;
  errorMessage: string | null;
  statusCode: number | null;
  attemptCount: number; // Number of completed HTTP delivery attempts performed
}

export const HTTP_TIMEOUT_MS = 15_000;
export const PROCESSING_LEASE_MS = 60_000; // 4x HTTP timeout

/**
 * Process a single delivery job message.
 *
 * Returns true if the job was successfully processed / handled (caller ACKs message).
 * Returns false if the job should be nacked with requeue for redelivery.
 */
export async function processDelivery(
  job: DeliveryJobMessage,
  encryptionKey: string,
  hmacVersion: string,
  logger: any
): Promise<boolean> {
  const prisma = getPrismaClient();

  // ─── 1. Load delivery + event + destination ──────────────
  const delivery = await prisma.delivery.findUnique({
    where: { id: job.deliveryId },
    include: {
      event: true,
      destination: {
        include: {
          organization: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!delivery) {
    logger.warn({ deliveryId: job.deliveryId }, 'Delivery not found — discarding stale job');
    return true; // Ack — stale job
  }

  // Terminal state check
  if (
    delivery.status === 'delivered' ||
    delivery.status === 'cancelled' ||
    delivery.status === 'failed'
  ) {
    logger.debug(
      { deliveryId: job.deliveryId, status: delivery.status },
      'Delivery already terminal — discarding message'
    );
    return true; // Ack
  }

  // ─── 2. Stale-Job & Crash-Window Protection ───────────────
  // A. Crash window recovery: if DB is already 'retrying' for this attempt,
  // ensure the retry job is published to RabbitMQ and ACK original.
  if (delivery.status === 'retrying') {
    if (delivery.attemptCount >= job.attemptNo) {
      const tier = getRetryTier(delivery.attemptCount);
      if (tier) {
        logger.info(
          { deliveryId: delivery.id, attemptCount: delivery.attemptCount },
          'Recovering retrying delivery from crash window — republishing retry job'
        );
        try {
          await publishTieredRetryJobConfirmed(
            {
              deliveryId: delivery.id,
              attemptNo: delivery.attemptCount + 1,
            },
            tier.queue
          );
        } catch (pubErr) {
          logger.error({ pubErr, deliveryId: delivery.id }, 'Failed to republish retry job during recovery');
          return false; // Nack to retry recovery
        }
      }
      return true; // Ack original message
    }
  }

  // B. Stale message protection: incoming attemptNo must match expected attempt (attemptCount + 1)
  if (delivery.attemptCount > job.attemptNo - 1) {
    logger.debug(
      {
        deliveryId: job.deliveryId,
        incomingAttempt: job.attemptNo,
        currentAttemptCount: delivery.attemptCount,
      },
      'Stale attempt message received — skipping'
    );
    return true; // Ack stale
  }

  const { event, destination } = delivery;

  // ─── 3. Check destination active status ──────────────────
  if (!destination.active) {
    logger.info({ deliveryId: job.deliveryId }, 'Destination paused — nacking for later');
    return false; // Nack with requeue
  }

  // ─── 4. Atomic claim with 60s lease ──────────────────────
  const claimResult = await prisma.$executeRaw`
    UPDATE deliveries
    SET
      status = 'processing',
      processing_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '60 seconds'
    WHERE id = ${job.deliveryId}::uuid
      AND attempt_count = ${job.attemptNo - 1}
      AND (
        status IN ('queued', 'retrying')
        OR (status = 'processing' AND (lease_expires_at IS NULL OR lease_expires_at < NOW()))
      )
  `;

  if (claimResult === 0) {
    // Check if another worker is actively holding a valid lease
    const freshDelivery = await prisma.delivery.findUnique({
      where: { id: job.deliveryId },
      select: { status: true, leaseExpiresAt: true, attemptCount: true },
    });

    if (freshDelivery?.status === 'processing' && freshDelivery.leaseExpiresAt && freshDelivery.leaseExpiresAt > new Date()) {
      logger.debug(
        { deliveryId: job.deliveryId },
        'Another worker actively holds lease — nacking for redelivery if needed'
      );
      return false; // Nack with requeue
    }

    logger.debug(
      { deliveryId: job.deliveryId, status: freshDelivery?.status },
      'Atomic claim skipped (status changed) — acking message'
    );
    return true; // Ack
  }

  // ─── 4b. Check destination rate limit ────────────────────
  const rateLimit = destination.rateLimit || 50;
  const rateCheck = await checkRateLimit(destination.id, rateLimit);
  if (!rateCheck.allowed) {
    logger.warn(
      { destinationId: destination.id, currentCount: rateCheck.currentCount, limit: rateLimit },
      'Destination rate limit reached — rescheduling to 10s retry queue'
    );
    await publishTieredRetryJobConfirmed(
      { deliveryId: delivery.id, attemptNo: job.attemptNo },
      'zyvan.delivery.retry.10s'
    );
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: 'retrying', leaseExpiresAt: null },
    });
    return true; // Ack original — safely rescheduled
  }

  // ─── 4c. Acquire destination concurrency slot lease ──────
  const concurrencyLimit = (destination as any).concurrencyLimit || DEFAULT_CONCURRENCY_LIMIT;
  const slotLease = await acquireSlotLease(destination.id, concurrencyLimit);
  if (!slotLease.acquired) {
    logger.warn(
      { destinationId: destination.id, limit: concurrencyLimit },
      'Destination concurrency limit reached — rescheduling to 10s retry queue'
    );
    await publishTieredRetryJobConfirmed(
      { deliveryId: delivery.id, attemptNo: job.attemptNo },
      'zyvan.delivery.retry.10s'
    );
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: 'retrying', leaseExpiresAt: null },
    });
    return true; // Ack original — safely rescheduled
  }

  try {
    // ─── 5. Record attempt ───────────────────────────────────
    const attemptNo = job.attemptNo;
    const attempt = await createAttempt({
      deliveryId: delivery.id,
      attemptNo,
    });

  // ─── 6. Send webhook via HTTP client ─────────────────────
  const payload = JSON.stringify(event.payload);

  const result = await sendWebhook({
    url: destination.url,
    payload,
    deliveryId: delivery.id,
    eventId: event.id,
    encryptedSecret: destination.secretRef,
    encryptionKey,
    hmacVersion,
    timeoutMs: HTTP_TIMEOUT_MS,
  });

  // ─── 7. Complete immutable attempt record ────────────────
  await completeAttempt(attempt.id, {
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    outcome: result.outcome,
    errorMessage: result.error,
    response: result.responseBody ? { body: result.responseBody } : null,
  });

  logger.info(
    {
      deliveryId: delivery.id,
      eventId: event.id,
      attemptNo,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      outcome: result.outcome,
    },
    `Delivery attempt #${attemptNo}: ${result.outcome}`
  );

  // ─── 8. Classify result: Success / Retry / DLQ ───────────

  // A. SUCCESS (HTTP 2xx)
  if (result.success) {
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'delivered',
        attemptCount: attemptNo,
        lastStatusCode: result.statusCode,
        leaseExpiresAt: null,
      },
    });

    await updateEventStatusIfComplete(event.id);
    return true; // Ack
  }

  // B. TERMINAL FAILURE (e.g. HTTP 4xx except 429)
  const failureClass = classifyFailure(
    result.outcome as 'failed' | 'timeout' | 'error',
    result.statusCode
  );

  if (failureClass === 'terminal') {
    logger.info(
      { deliveryId: delivery.id, statusCode: result.statusCode },
      'Terminal failure — transitioning to authoritative DLQ'
    );
    await moveToDLQ(
      delivery.id,
      event.id,
      `Terminal HTTP ${result.statusCode}: ${result.error || 'Client error'}`,
      attemptNo,
      result.statusCode,
      prisma
    );
    return true; // Ack
  }

  // C. RETRYABLE FAILURE
  const retryPolicy = parseRetryPolicy(destination.retryPolicy);
  const tier = getRetryTier(attemptNo);

  // Check if retries exhausted
  if (!tier || attemptNo >= (retryPolicy.maxAttempts || MAX_RETRY_ATTEMPTS)) {
    logger.info(
      { deliveryId: delivery.id, attemptNo, maxAttempts: retryPolicy.maxAttempts },
      'Retries exhausted — transitioning to authoritative DLQ'
    );
    await moveToDLQ(
      delivery.id,
      event.id,
      `Retry exhausted after ${attemptNo} attempts. Last: ${result.error || `HTTP ${result.statusCode}`}`,
      attemptNo,
      result.statusCode,
      prisma
    );
    return true; // Ack
  }

  // D. TIERED RETRY (DB-First Transition + Confirmed Publish)
  const nextRetryAt = new Date(Date.now() + tier.ttlMs);

  // 1. Transition DB first
  await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      status: 'retrying',
      attemptCount: attemptNo,
      lastStatusCode: result.statusCode,
      nextRetryAt,
      leaseExpiresAt: null,
    },
  });

  await prisma.event.update({
    where: { id: event.id },
    data: { status: 'retrying' },
  });

  // 2. Publish retry job with broker confirmation
  try {
    await publishTieredRetryJobConfirmed(
      {
        deliveryId: delivery.id,
        attemptNo: attemptNo + 1,
      },
      tier.queue
    );

    logger.info(
      {
        deliveryId: delivery.id,
        attemptNo,
        nextAttempt: attemptNo + 1,
        tier: tier.tier,
        queue: tier.queue,
        nextRetryAt: nextRetryAt.toISOString(),
      },
      `Tiered retry scheduled on ${tier.queue} for attempt #${attemptNo + 1}`
    );

    return true; // Only ACK original message after broker confirms retry publish!
    } catch (pubErr) {
      logger.error(
        { pubErr, deliveryId: delivery.id, queue: tier.queue },
        'Failed to publish retry job with publisher confirm — nacking original message with requeue'
      );
      return false; // Nack with requeue so message is redelivered
    }
  } finally {
    await releaseSlotLease(slotLease.slotKey, slotLease.token);
  }
}

/**
 * Move a delivery to the authoritative PostgreSQL DeadLetter state.
 */
async function moveToDLQ(
  deliveryId: string,
  eventId: string,
  reason: string,
  attemptCount: number,
  statusCode: number | null,
  prisma: any
): Promise<void> {
  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'failed',
        attemptCount,
        lastStatusCode: statusCode,
        leaseExpiresAt: null,
      },
    }),
    prisma.deadLetter.upsert({
      where: { deliveryId },
      create: {
        eventId,
        deliveryId,
        reason,
      },
      update: {
        reason,
      },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: { status: 'dead_letter' },
    }),
  ]);
}

/**
 * Check if all deliveries for an event are complete.
 * If all delivered → mark event as delivered.
 */
async function updateEventStatusIfComplete(eventId: string): Promise<void> {
  const prisma = getPrismaClient();

  const deliveries = await prisma.delivery.findMany({
    where: { eventId },
    select: { status: true },
  });

  const allDelivered = deliveries.every((d: any) => d.status === 'delivered');
  if (allDelivered) {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'delivered' },
    });
  }
}
