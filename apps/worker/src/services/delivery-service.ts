// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Delivery Service
//
// The core delivery processor. For each job:
//   1. Load delivery + event + destination from PostgreSQL
//   2. Check destination is active, tenant is not paused
//   3. Build and send the webhook via HTTP client
//   4. Record attempt (immutable)
//   5. Classify result: success / retry / DLQ
//
// This is the reliability backbone of Zyvan.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import { sendWebhook } from './http-client';
import { createAttempt, completeAttempt } from './attempt-service';
import {
  classifyFailure,
  shouldRetry,
  calculateBackoff,
  parseRetryPolicy,
} from './retry-service';
import { publishRetryJob } from '../lib/rabbitmq';

export interface DeliveryJob {
  deliveryId: string;
  eventId: string;
}

/**
 * Process a single delivery job.
 *
 * Returns true if the job was processed (regardless of outcome),
 * false if the job should be nacked for redelivery.
 */
export async function processDelivery(
  job: DeliveryJob,
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
          tenant: { select: { id: true, status: true, concurrencyLimit: true, rateLimit: true } },
        },
      },
    },
  });

  if (!delivery) {
    logger.warn({ deliveryId: job.deliveryId }, 'Delivery not found — discarding job');
    return true; // Ack — stale job
  }

  // Already delivered or cancelled — skip
  if (delivery.status === 'delivered' || delivery.status === 'cancelled' || delivery.status === 'failed') {
    logger.debug({ deliveryId: job.deliveryId, status: delivery.status }, 'Delivery already terminal — skipping');
    return true;
  }

  const { event, destination } = delivery;

  // ─── 2. Check destination and tenant status ──────────────
  if (!destination.active) {
    logger.info({ deliveryId: job.deliveryId }, 'Destination paused — nacking for later');
    return false; // Nack — will be redelivered when destination is resumed
  }

  if (destination.tenant.status === 'paused') {
    logger.info({ deliveryId: job.deliveryId }, 'Tenant paused — nacking for later');
    return false;
  }

  if (destination.tenant.status === 'disabled') {
    logger.warn({ deliveryId: job.deliveryId }, 'Tenant disabled — marking delivery failed');
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: 'failed' },
    });
    return true;
  }

  // ─── 3. Update delivery status to delivering ─────────────
  const attemptNo = delivery.attemptCount + 1;
  await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: 'delivering', attemptCount: attemptNo },
  });

  // ─── 4. Create attempt record ────────────────────────────
  const attempt = await createAttempt({
    deliveryId: delivery.id,
    attemptNo,
  });

  // ─── 5. Send the webhook ─────────────────────────────────
  const payload = JSON.stringify(event.payload);

  const result = await sendWebhook({
    url: destination.url,
    payload,
    deliveryId: delivery.id,
    eventId: event.id,
    encryptedSecret: destination.secretRef,
    encryptionKey,
    hmacVersion,
    timeoutMs: 30000, // 30 second timeout
  });

  // ─── 6. Complete the attempt record ──────────────────────
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

  // ─── 7. Classify and decide: success / retry / DLQ ──────
  if (result.success) {
    // ✅ SUCCESS — mark delivery and event as delivered
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: 'delivered', lastStatusCode: result.statusCode },
    });

    // Update event status if all deliveries are delivered
    await updateEventStatusIfComplete(event.id);

    return true;
  }

  // ❌ FAILURE — classify and decide
  const retryPolicy = parseRetryPolicy(destination.retryPolicy);
  const failureClass = classifyFailure(result.outcome, result.statusCode);

  if (failureClass === 'terminal') {
    // Terminal failure (4xx) — go directly to DLQ
    logger.info(
      { deliveryId: delivery.id, statusCode: result.statusCode },
      'Terminal failure — moving to DLQ'
    );
    await moveToDLQ(delivery.id, event.id, `Terminal HTTP ${result.statusCode}`, prisma);
    return true;
  }

  // Retryable failure — check if we should retry
  if (shouldRetry(attemptNo, retryPolicy)) {
    const delayMs = calculateBackoff(attemptNo, retryPolicy);
    const nextRetryAt = new Date(Date.now() + delayMs);

    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'retrying',
        lastStatusCode: result.statusCode,
        nextRetryAt,
      },
    });

    // Update event status to retrying
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'retrying' },
    });

    // Schedule retry via RabbitMQ delayed queue
    publishRetryJob(delivery.id, event.id, delayMs, logger);

    logger.info(
      { deliveryId: delivery.id, attemptNo, delayMs, nextRetryAt: nextRetryAt.toISOString() },
      `Retry scheduled — attempt #${attemptNo + 1} in ${Math.round(delayMs / 1000)}s`
    );

    return true;
  }

  // Retry exhausted — move to DLQ
  logger.info(
    { deliveryId: delivery.id, attemptNo, maxAttempts: retryPolicy.maxAttempts },
    'Retry exhausted — moving to DLQ'
  );
  await moveToDLQ(
    delivery.id,
    event.id,
    `Retry exhausted after ${attemptNo} attempts. Last: ${result.error || `HTTP ${result.statusCode}`}`,
    prisma
  );

  return true;
}

/**
 * Move a delivery to the dead-letter queue.
 */
async function moveToDLQ(
  deliveryId: string,
  eventId: string,
  reason: string,
  prisma: any
): Promise<void> {
  await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'failed' },
    }),
    prisma.deadLetter.create({
      data: {
        eventId,
        deliveryId,
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
