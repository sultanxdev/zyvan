// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Attempt Service
// Creates and updates immutable attempt records.
// The attempt history is the debugging backbone — engineers
// reconstruct incidents from these records.
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/database';
import type { Attempt, AttemptOutcome } from '@prisma/client';

/**
 * Create a new attempt record at the start of a delivery attempt.
 */
export async function createAttempt(data: {
  deliveryId: string;
  attemptNo: number;
}): Promise<Attempt> {
  const prisma = getPrismaClient();
  return prisma.attempt.create({
    data: {
      deliveryId: data.deliveryId,
      attemptNo: data.attemptNo,
      outcome: 'failed', // Default — updated when we have the result
    },
  });
}

/**
 * Complete an attempt record with the HTTP result.
 * Attempt records are immutable after this update.
 */
export async function completeAttempt(
  id: string,
  data: {
    statusCode: number | null;
    latencyMs: number;
    outcome: AttemptOutcome;
    errorMessage: string | null;
    response: any;
  }
): Promise<Attempt> {
  const prisma = getPrismaClient();
  return prisma.attempt.update({
    where: { id },
    data: {
      endedAt: new Date(),
      statusCode: data.statusCode,
      latencyMs: data.latencyMs,
      outcome: data.outcome,
      errorMessage: data.errorMessage,
      response: data.response,
    },
  });
}
