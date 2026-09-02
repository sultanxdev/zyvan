// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Service
// Business logic for DLQ inspection and recovery.
// ─────────────────────────────────────────────────────────────

import * as dlqRepo from './repository';

export async function listDeadLetters(
  projectId: string,
  cursor?: string,
  limit: number = 50
) {
  const result = await dlqRepo.listByProject({
    projectId,
    cursor,
    limit: Math.min(Math.max(limit, 1), 100),
  });

  return {
    data: result.deadLetters.map((dl) => ({
      id: dl.id,
      eventId: dl.eventId,
      deliveryId: dl.deliveryId,
      reason: dl.reason,
      createdAt: dl.createdAt,
      event: {
        id: dl.event.id,
        eventType: dl.event.eventType,
        tenant: dl.event.tenant,
        status: dl.event.status,
        createdAt: dl.event.createdAt,
      },
      destination: dl.delivery.destination,
      latestAttempt: dl.delivery.attempts[0] || null,
    })),
    pagination: {
      nextCursor: result.nextCursor,
      hasMore: result.nextCursor !== null,
    },
  };
}

export async function getDeadLetter(id: string, projectId: string) {
  const dl = await dlqRepo.findById(id, projectId);
  if (!dl) return null;

  return {
    id: dl.id,
    eventId: dl.eventId,
    deliveryId: dl.deliveryId,
    reason: dl.reason,
    createdAt: dl.createdAt,
    event: {
      id: dl.event.id,
      eventType: dl.event.eventType,
      idempotencyKey: dl.event.idempotencyKey,
      payload: dl.event.payload,
      headers: dl.event.headers,
      status: dl.event.status,
      tenant: dl.event.tenant,
      createdAt: dl.event.createdAt,
    },
    delivery: {
      id: dl.delivery.id,
      status: dl.delivery.status,
      attemptCount: dl.delivery.attemptCount,
      lastStatusCode: dl.delivery.lastStatusCode,
      destination: dl.delivery.destination,
      attempts: dl.delivery.attempts,
    },
  };
}
