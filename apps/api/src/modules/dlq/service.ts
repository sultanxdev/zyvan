// ─────────────────────────────────────────────────────────────
// Zyvan API — Dead Letter Queue (DLQ) Service
// Business logic for DLQ operational triage, metrics summary,
// and detail retrieval.
// ─────────────────────────────────────────────────────────────

import * as dlqRepo from './repository';
import type { DLQFilterInput, DLQSummaryFilterInput } from '@zyvan/validation';

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
