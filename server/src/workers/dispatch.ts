import { Worker, Job } from 'bullmq';
import { config } from '../config/env';
import { db } from '../config/db';
import { generateSignature } from '../core/signing';
import { queue } from '../config/queue';

/**
 * Exponential backoff with jitter.
 *
 * delay(n) = min(base * 2^n + rand(0, jitter), maxDelay)
 *
 * n=0 → ~1s, n=1 → ~2s, n=2 → ~4s … n=5 → ~32s, capped at 1 hour
 */
function calculateBackoffMs(retryCount: number): number {
    const BASE_MS = 1_000;
    const JITTER_MS = 500;
    const MAX_MS = 3_600_000; // 1 hour
    const delay = BASE_MS * Math.pow(2, retryCount) + Math.random() * JITTER_MS;
    return Math.min(delay, MAX_MS);
}

/**
 * BullMQ Worker — consumes jobs from the "event-dispatch" queue.
 *
 * Each job carries `{ eventId }`. The worker:
 *  1. Loads the event + endpoint from PostgreSQL
 *  2. Marks event as DISPATCHING
 *  3. Signs payload with HMAC-SHA256
 *  4. Makes HTTP POST to the endpoint URL
 *  5. Records the delivery attempt in delivery_attempts
 *  6. Transitions event state:
 *     - 2xx → DELIVERED
 *     - 4xx → DEAD_LETTERED (permanent failure)
 *     - 5xx / timeout / network error → retry OR DEAD_LETTERED (max retries)
 */
export const dispatchWorker = new Worker(
    'event-dispatch',
    async (job: Job) => {
        const { eventId } = job.data as { eventId: string };

        // ── 1. Load event + endpoint ───────────────────────────────────
        const event = await db.event.findUnique({
            where: { id: eventId },
            include: { endpoint: true },
        });

        if (!event) {
            console.warn(`[Worker] Event ${eventId} not found — skipping`);
            return;
        }

        if (!event.endpoint.isActive) {
            console.warn(`[Worker] Endpoint ${event.endpoint.id} is inactive — dead-lettering event ${eventId}`);
            await db.event.update({
                where: { id: eventId },
                data: {
                    status: 'DEAD_LETTERED',
                    failureReason: 'Endpoint deactivated before delivery',
                },
            });
            return;
        }

        // ── 2. Mark as DISPATCHING ─────────────────────────────────────
        await db.event.update({
            where: { id: eventId },
            data: { status: 'DISPATCHING' },
        });

        // ── 3. Build signed request ────────────────────────────────────
        const body = JSON.stringify(event.payload);
        const signature = generateSignature(event.endpoint.signingSecret, body);
        const attemptNumber = event.retryCount + 1;
        const startTime = Date.now();

        let httpStatus: number | null = null;
        let responseBody: string | null = null;
        let responseHeaders: Record<string, string> | null = null;
        let errorMessage: string | null = null;

        // ── 4. Deliver ─────────────────────────────────────────────────
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                event.endpoint.timeoutMs
            );

            const response = await fetch(event.endpoint.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zyvan-Event-Id': event.id,
                    'X-Zyvan-Event-Type': event.eventType,
                    'X-Zyvan-Signature': `sha256=${signature}`,
                    'X-Zyvan-Timestamp': new Date().toISOString(),
                },
                body,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            httpStatus = response.status;
            responseBody = (await response.text()).slice(0, 2048); // cap at 2KB

            // Convert headers to plain object
            responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders![key] = value;
            });
        } catch (err: any) {
            if (err.name === 'AbortError') {
                errorMessage = `Delivery timed out after ${event.endpoint.timeoutMs}ms`;
            } else {
                errorMessage = err.message ?? 'Unknown network error';
            }
        }

        const latencyMs = Date.now() - startTime;

        // ── 5. Log attempt ─────────────────────────────────────────────
        await db.deliveryAttempt.create({
            data: {
                eventId,
                attemptNumber,
                httpStatus,
                responseBody,
                responseHeaders: responseHeaders ?? undefined,
                latencyMs,
                errorMessage,
            },
        });

        // ── 6. Transition event state ──────────────────────────────────
        const isSuccess = httpStatus !== null && httpStatus >= 200 && httpStatus < 300;
        const isPermanentFailure = httpStatus !== null && httpStatus >= 400 && httpStatus < 500;
        const maxRetries = event.endpoint.maxRetries;
        const retriesExhausted = event.retryCount >= maxRetries;

        if (isSuccess) {
            // ✅ Delivered — done
            await db.event.update({
                where: { id: eventId },
                data: { status: 'DELIVERED' },
            });
            console.log(`[Worker] ✅ Event ${eventId} delivered (attempt #${attemptNumber}, HTTP ${httpStatus})`);

        } else if (isPermanentFailure) {
            // ❌ 4xx = permanent failure — immediately dead-letter
            await db.event.update({
                where: { id: eventId },
                data: {
                    status: 'DEAD_LETTERED',
                    failureReason: `Permanent HTTP ${httpStatus} — client error`,
                },
            });
            console.warn(`[Worker] ❌ Event ${eventId} dead-lettered (perm failure HTTP ${httpStatus})`);

        } else if (retriesExhausted) {
            // ❌ Max retries exhausted — dead-letter
            const reason = errorMessage ?? `HTTP ${httpStatus} — max retries (${maxRetries}) exhausted`;
            await db.event.update({
                where: { id: eventId },
                data: {
                    status: 'DEAD_LETTERED',
                    failureReason: reason,
                },
            });
            console.warn(`[Worker] ❌ Event ${eventId} dead-lettered (retries exhausted: ${reason})`);

        } else {
            // ⏳ Schedule retry with exponential backoff
            const delayMs = calculateBackoffMs(event.retryCount);
            const newRetryCount = event.retryCount + 1;

            await db.event.update({
                where: { id: eventId },
                data: {
                    status: 'RETRY_SCHEDULED',
                    retryCount: { increment: 1 },
                },
            });

            // Re-enqueue with delay — BullMQ handles the timing
            await queue.add(
                'dispatch',
                { eventId },
                {
                    jobId: `${eventId}_retry_${newRetryCount}`, // unique job ID per attempt
                    delay: delayMs,
                }
            );

            const reason = errorMessage ?? `HTTP ${httpStatus}`;
            console.log(
                `[Worker] ⏳ Event ${eventId} retry #${newRetryCount} scheduled in ${Math.round(delayMs / 1000)}s (${reason})`
            );
        }
    },
    {
        connection: { url: config.redisUrl },
        concurrency: 10, // process up to 10 events simultaneously
    }
);

// ── Worker lifecycle events ────────────────────────────────────────
dispatchWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

dispatchWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed unexpectedly:`, err.message);
});

dispatchWorker.on('error', (err) => {
    console.error('[Worker] Worker error:', err.message);
});

console.log('[Worker] Dispatch worker started (concurrency: 10)');
