// ─────────────────────────────────────────────────────────────
// Zyvan API — Replay Service
// Handles event replay workflows scoped to organization.
// Crucial architectural rule:
//   Replay must NEVER overwrite or mutate historical attempts.
//   Every replay creates a brand new Delivery record and a
//   linked Replay record, creating a fresh attempt lineage.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import { publishDeliveryJobsConfirmed } from '../../lib/rabbitmq';
import { logger } from '../../lib/logger';

export interface ReplayEventResult {
  replay_id: string;
  delivery_id: string;
  event_id: string;
  destination_id: string;
  status: string;
}

/**
 * Replay an event to one or all of its destinations.
 */
export async function replayEvent(
  eventId: string,
  organizationId: string,
  destinationId?: string
): Promise<ReplayEventResult[]> {
  const prisma = getPrismaClient();

  // 1. Verify event exists and belongs to this organization
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizationId },
    include: {
      deliveries: {
        select: { destinationId: true },
      },
    },
  });

  if (!event) {
    const err = new Error('Event not found in this organization');
    (err as any).code = 'not_found';
    (err as any).statusCode = 404;
    throw err;
  }

  // 2. Determine target destinations
  let targetDestinationIds: string[] = [];

  if (destinationId) {
    const dest = await prisma.destination.findFirst({
      where: {
        id: destinationId,
        organizationId,
      },
    });

    if (!dest) {
      const err = new Error('Destination not found or does not belong to this organization');
      (err as any).code = 'not_found';
      (err as any).statusCode = 404;
      throw err;
    }

    targetDestinationIds = [destinationId];
  } else {
    // Replay to all unique original destinations
    targetDestinationIds = Array.from(
      new Set(event.deliveries.map((d) => d.destinationId))
    );

    if (targetDestinationIds.length === 0) {
      const destinations = await prisma.destination.findMany({
        where: { organizationId, active: true },
        select: { id: true },
      });
      targetDestinationIds = destinations.map((d) => d.id);
    }
  }

  if (targetDestinationIds.length === 0) {
    const err = new Error('No active destinations found to replay to');
    (err as any).code = 'conflict';
    (err as any).statusCode = 409;
    throw err;
  }

  // 3. Create new deliveries, replays, and outbox messages in a transaction
  const results = await prisma.$transaction(async (tx) => {
    const created: Array<{ replayId: string; deliveryId: string; destinationId: string }> = [];

    for (const destId of targetDestinationIds) {
      // New delivery — original attempts untouched
      const newDelivery = await tx.delivery.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          destinationId: destId,
          status: 'queued',
          attemptCount: 0,
        },
      });

      // Outbox message for reliable delivery sync
      await tx.outboxMessage.create({
        data: {
          organizationId: event.organizationId,
          deliveryId: newDelivery.id,
        },
      });

      // Link replay lineage
      const replay = await tx.replay.create({
        data: {
          eventId: event.id,
          deliveryId: newDelivery.id,
          status: 'queued',
        },
      });

      created.push({
        replayId: replay.id,
        deliveryId: newDelivery.id,
        destinationId: destId,
      });
    }

    // Update event status to queued
    await tx.event.update({
      where: { id: event.id },
      data: { status: 'queued' },
    });

    return created;
  });

  // 4. Publish newly created deliveries to RabbitMQ with publisher confirms
  if (results.length > 0) {
    const jobs = results.map((item) => ({
      deliveryId: item.deliveryId,
      attemptNo: 1,
    }));

    try {
      const { confirmed, failed } = await publishDeliveryJobsConfirmed(jobs);

      if (confirmed.length > 0) {
        await prisma.outboxMessage.deleteMany({
          where: {
            deliveryId: { in: confirmed },
          },
        });
        logger.debug(
          { confirmedCount: confirmed.length, eventId: event.id },
          'Confirmed replayed delivery jobs published and removed from outbox'
        );
      }

      if (failed.length > 0) {
        logger.warn(
          { failedCount: failed.length, eventId: event.id },
          'Some replayed delivery jobs failed broker confirmation — outbox reconciler will recover'
        );
      }
    } catch (err) {
      logger.error(
        { err, eventId: event.id },
        'Error publishing replayed deliveries — outbox reconciler will recover'
      );
    }
  }

  logger.info(
    { eventId: event.id, count: results.length, organizationId },
    'Event replay initiated successfully'
  );

  return results.map((r) => ({
    replay_id: r.replayId,
    delivery_id: r.deliveryId,
    event_id: event.id,
    destination_id: r.destinationId,
    status: 'queued',
  }));
}
