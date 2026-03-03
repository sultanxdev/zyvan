import { Prisma } from '@prisma/client';
import { db } from '../config/db';
import { queue } from '../config/queue';
import { IngestEventInput } from '../api/events/validator';

/**
 * Atomically checks the idempotency key and inserts the event
 * in a single transaction — the Reliability Boundary.
 *
 * Returns { event, isNew: true }  → first time this key is seen
 * Returns { event, isNew: false } → duplicate key, return existing event
 */
export async function ingestEvent(
    input: IngestEventInput,
    idempotencyKey: string
) {
    return await db.$transaction(async (tx) => {
        // 1. Check idempotency first (fast path on duplicate)
        const existing = await tx.event.findUnique({
            where: { idempotencyKey },
        });

        if (existing) {
            return { event: existing, isNew: false };
        }

        // 2. Verify endpoint exists and is active
        const endpoint = await tx.endpoint.findFirst({
            where: { id: input.endpoint_id, isActive: true },
        });

        if (!endpoint) {
            throw Object.assign(new Error('ENDPOINT_NOT_FOUND'), {
                code: 'ENDPOINT_NOT_FOUND',
            });
        }

        // 3. Insert the event — this is the Reliability Boundary commit
        const event = await tx.event.create({
            data: {
                idempotencyKey,
                endpointId: input.endpoint_id,
                eventType: input.event_type,
                payload: input.payload,
                metadata: input.metadata ?? null,
                status: 'RECEIVED',
            },
        });

        return { event, isNew: true };
    });
}

/**
 * Push the event ID to the dispatch queue.
 * Called OUTSIDE the transaction so the DB commit is visible to workers.
 */
export async function enqueueEvent(eventId: string): Promise<void> {
    await queue.add(
        'dispatch',
        { eventId },
        {
            jobId: eventId, // idempotent job — BullMQ ignores duplicate jobIds
            attempts: 1,       // workers manage retries manually for full control
        }
    );
}
