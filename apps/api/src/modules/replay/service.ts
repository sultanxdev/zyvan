// ─────────────────────────────────────────────────────────────
// Zyvan API — Replay Service
//
// Handles event replay workflows.
// Crucial architectural rule:
//   Replay must NEVER overwrite or mutate historical attempts.
//   Every replay creates a brand new Delivery record and a
//   linked Replay record, creating a fresh attempt lineage.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import { publishDeliveryJob } from '../../lib/rabbitmq';
import { logger } from '../../lib/logger';

export interface ReplayEventResult {
  replay_id: string;
  delivery_id: string;
  event_id: string;
  status: string;
}

/**
 * Replay an event to one or all of its original destinations.
 *
 * 1. Verify event belongs to caller's project
 * 2. Find target destination(s)
 * 3. In transaction: create new Delivery + Replay records
 * 4. Publish delivery job(s) to RabbitMQ
 * 5. Return replay record info
 */
export async function replayEvent(
  eventId: string,
  projectId: string,
  destinationId?: string
): Promise<ReplayEventResult[]> {
  const prisma = getPrismaClient();

  // 1. Verify event exists and belongs to this project
  const event = await prisma.event.findFirst({
    where: { id: eventId, projectId },
    include: {
      deliveries: {
        select: { destinationId: true },
      },
    },
  });

  if (!event) {
    const err = new Error('Event not found');
    (err as any).code = 'not_found';
    (err as any).statusCode = 404;
    throw err;
  }

  // 2. Determine target destinations
  let targetDestinationIds: string[] = [];

  if (destinationId) {
    // Verify destination belongs to this tenant
    const dest = await prisma.destination.findFirst({
      where: {
        id: destinationId,
        tenantId: event.tenantId,
      },
    });

    if (!dest) {
      const err = new Error('Destination not found or does not belong to this tenant');
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
      // If no prior deliveries, find active destinations for tenant
      const destinations = await prisma.destination.findMany({
        where: { tenantId: event.tenantId, active: true },
        select: { id: true },
      });
      targetDestinationIds = destinations.map((d) => d.id);
    }
  }

  if (targetDestinationIds.length === 0) {
    const err = new Error('No destinations found to replay to');
    (err as any).code = 'conflict';
    (err as any).statusCode = 409;
    throw err;
  }

  // 3. Create new deliveries and replays in a transaction
  const results = await prisma.$transaction(async (tx) => {
    const created: Array<{ replayId: string; deliveryId: string }> = [];

    for (const destId of targetDestinationIds) {
      // New delivery — original attempts untouched
      const newDelivery = await tx.delivery.create({
        data: {
          eventId: event.id,
          destinationId: destId,
          status: 'queued',
          attemptCount: 0,
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
      });
    }

    // Update event status to queued
    await tx.event.update({
      where: { id: event.id },
      data: { status: 'queued' },
    });

    return created;
  });

  // 4. Publish newly created deliveries to RabbitMQ
  for (const item of results) {
    try {
      publishDeliveryJob({
        deliveryId: item.deliveryId,
        eventId: event.id,
        destinationId: targetDestinationIds[0],
        attemptNo: 1,
      });
    } catch (err) {
      logger.error(
        { err, deliveryId: item.deliveryId, eventId: event.id },
        'Failed to publish replayed delivery job to RabbitMQ'
      );
    }
  }

  logger.info(
    { eventId: event.id, count: results.length },
    'Event replay initiated successfully'
  );

  return results.map((r) => ({
    replay_id: r.replayId,
    delivery_id: r.deliveryId,
    event_id: event.id,
    status: 'queued',
  }));
}
