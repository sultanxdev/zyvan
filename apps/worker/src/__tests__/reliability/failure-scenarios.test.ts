import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDelivery } from '../../services/delivery-service';
import { getPrismaClient } from '@zyvan/db';
import * as rabbitmq from '../../lib/rabbitmq';
import * as httpClient from '../../services/http-client';
import * as concurrency from '../../services/destination-concurrency';
import * as rateLimiter from '../../services/destination-rate-limiter';

vi.mock('../../lib/rabbitmq', () => ({
  publishTieredRetryJobConfirmed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/http-client', () => ({
  sendWebhook: vi.fn(),
}));

vi.mock('../../services/destination-concurrency', () => ({
  DEFAULT_CONCURRENCY_LIMIT: 5,
  acquireSlotLease: vi.fn().mockResolvedValue({ acquired: true, slotKey: 'dest:1:slot:1', token: 'tok-1' }),
  releaseSlotLease: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../services/destination-rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, currentCount: 1 }),
}));

vi.mock('@zyvan/db', () => {
  const mockPrisma = {
    delivery: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    event: {
      update: vi.fn(),
    },
    attempt: {
      create: vi.fn().mockResolvedValue({ id: 'att-1' }),
      update: vi.fn().mockResolvedValue({ id: 'att-1' }),
    },
    deadLetter: {
      upsert: vi.fn(),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $transaction: vi.fn().mockImplementation((actions) => Promise.all(actions)),
  };
  return {
    getPrismaClient: vi.fn().mockReturnValue(mockPrisma),
  };
});

describe('PR 2.10: Webhook Reliability & Failure Scenarios', () => {
  const mockPrisma = getPrismaClient() as any;
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Scenario A: Endpoint 500 error → tiered retry (10s) ──
  it('Scenario A: Endpoint 500 triggers DB-first retrying transition and publishes to 10s retry tier', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-500',
      status: 'queued',
      attemptCount: 0,
      destination: {
        id: 'dest-1',
        active: true,
        url: 'https://api.merchant.com/webhook',
        secretRef: 'sec-1',
        rateLimit: 20,
      },
      event: { id: 'evt-1', payload: { data: 'order_paid' } },
    });

    vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
      success: false,
      statusCode: 500,
      latencyMs: 350,
      outcome: 'failed',
      error: 'HTTP 500 Internal Server Error',
      responseBody: 'Internal Server Error',
    });

    const result = await processDelivery(
      { deliveryId: 'del-500', attemptNo: 1 },
      'encryption-key-32-chars-long!!!!',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    // Verified DB updated first
    expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-500' },
        data: expect.objectContaining({ status: 'retrying', attemptCount: 1, lastStatusCode: 500 }),
      })
    );
    // Verified retry job published to tier 10s
    expect(rabbitmq.publishTieredRetryJobConfirmed).toHaveBeenCalledWith(
      { deliveryId: 'del-500', attemptNo: 2 },
      'zyvan.delivery.retry.10s'
    );
  });

  // ── Scenario B: Terminal 400 error → immediate DLQ, no retry ──
  it('Scenario B: Terminal 400 client error moves immediately to authoritative PostgreSQL DeadLetter', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-400',
      status: 'queued',
      attemptCount: 0,
      destination: {
        id: 'dest-1',
        active: true,
        url: 'https://api.merchant.com/webhook',
        secretRef: null,
      },
      event: { id: 'evt-2', payload: {} },
    });

    vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
      success: false,
      statusCode: 400,
      latencyMs: 40,
      outcome: 'failed',
      error: 'HTTP 400 Bad Request',
      responseBody: 'Invalid signature or payload structure',
    });

    const result = await processDelivery(
      { deliveryId: 'del-400', attemptNo: 1 },
      'encryption-key-32-chars-long!!!!',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    // Verified DLQ transition
    expect(mockPrisma.deadLetter.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          eventId: 'evt-2',
          deliveryId: 'del-400',
        }),
      })
    );
    // Verified NO retry was published
    expect(rabbitmq.publishTieredRetryJobConfirmed).not.toHaveBeenCalled();
  });

  // ── Scenario C: Endpoint timeout (15s exceeded) ──
  it('Scenario C: HTTP timeout is classified as retryable and scheduled for retry', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-timeout',
      status: 'queued',
      attemptCount: 0,
      destination: {
        id: 'dest-1',
        active: true,
        url: 'https://api.merchant.com/slow',
        secretRef: null,
      },
      event: { id: 'evt-3', payload: {} },
    });

    vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
      success: false,
      statusCode: null,
      latencyMs: 15002,
      outcome: 'timeout',
      error: 'Connection timed out (15000ms)',
      responseBody: null,
    });

    const result = await processDelivery(
      { deliveryId: 'del-timeout', attemptNo: 1 },
      'encryption-key-32-chars-long!!!!',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-timeout' },
        data: expect.objectContaining({ status: 'retrying' }),
      })
    );
    expect(rabbitmq.publishTieredRetryJobConfirmed).toHaveBeenCalledWith(
      { deliveryId: 'del-timeout', attemptNo: 2 },
      'zyvan.delivery.retry.10s'
    );
  });

  // ── Scenario D: Retries exhausted after 5 attempts → DeadLetter ──
  it('Scenario D: Retries exhausted on attempt 5 transitions delivery to DeadLetter', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-exhausted',
      status: 'queued',
      attemptCount: 4, // 4 prior attempts
      destination: {
        id: 'dest-1',
        active: true,
        url: 'https://api.merchant.com/webhook',
        secretRef: null,
        retryPolicy: { maxAttempts: 5 },
      },
      event: { id: 'evt-4', payload: {} },
    });

    vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
      success: false,
      statusCode: 503,
      latencyMs: 200,
      outcome: 'failed',
      error: 'HTTP 503 Service Unavailable',
      responseBody: 'Under maintenance',
    });

    const result = await processDelivery(
      { deliveryId: 'del-exhausted', attemptNo: 5 },
      'encryption-key-32-chars-long!!!!',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    // Verified final transition to DeadLetter
    expect(mockPrisma.deadLetter.upsert).toHaveBeenCalled();
    // No more retries
    expect(rabbitmq.publishTieredRetryJobConfirmed).not.toHaveBeenCalled();
  });

  // ── Scenario E: Destination rate limit exceeded ──
  it('Scenario E: Destination rate limit saturated reschedules delivery to 10s delay queue without consuming attempt', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-ratelimit',
      status: 'queued',
      attemptCount: 0,
      destination: {
        id: 'dest-rate',
        active: true,
        url: 'https://api.merchant.com/webhook',
        rateLimit: 10,
      },
      event: { id: 'evt-5', payload: {} },
    });

    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      currentCount: 15,
    });

    const result = await processDelivery(
      { deliveryId: 'del-ratelimit', attemptNo: 1 },
      'encryption-key-32-chars-long!!!!',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    // Verified rescheduled to 10s retry queue
    expect(rabbitmq.publishTieredRetryJobConfirmed).toHaveBeenCalledWith(
      { deliveryId: 'del-ratelimit', attemptNo: 1 },
      'zyvan.delivery.retry.10s'
    );
    // Webhook was NOT sent
    expect(httpClient.sendWebhook).not.toHaveBeenCalled();
  });

  // ── Scenario F: Destination concurrency limit saturated ──
  it('Scenario F: Destination concurrency limit saturated reschedules to delay queue', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-concurrency',
      status: 'queued',
      attemptCount: 0,
      destination: {
        id: 'dest-conc',
        active: true,
        url: 'https://api.merchant.com/webhook',
      },
      event: { id: 'evt-6', payload: {} },
    });

    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValueOnce({
      allowed: true,
      currentCount: 1,
    });
    vi.mocked(concurrency.acquireSlotLease).mockResolvedValueOnce({
      acquired: false,
    });

    const result = await processDelivery(
      { deliveryId: 'del-concurrency', attemptNo: 1 },
      'encryption-key-32-chars-long!!!!',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    // Verified rescheduled to 10s queue
    expect(rabbitmq.publishTieredRetryJobConfirmed).toHaveBeenCalledWith(
      { deliveryId: 'del-concurrency', attemptNo: 1 },
      'zyvan.delivery.retry.10s'
    );
    expect(httpClient.sendWebhook).not.toHaveBeenCalled();
  });

  // ── Scenario G: Crash-window redelivery ──
  it('Scenario G: Delivery already marked retrying in DB republishes retry job and ACKs original', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-crash-recovery',
      status: 'retrying',
      attemptCount: 1, // DB already progressed to attempt 1
      destination: {
        id: 'dest-1',
        active: true,
      },
      event: { id: 'evt-7', payload: {} },
    });

    const result = await processDelivery(
      { deliveryId: 'del-crash-recovery', attemptNo: 1 }, // Redelivered unacked message for attempt 1
      'encryption-key-32-chars-long!!!!',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    // Re-published retry job for attempt 2 to 10s queue
    expect(rabbitmq.publishTieredRetryJobConfirmed).toHaveBeenCalledWith(
      { deliveryId: 'del-crash-recovery', attemptNo: 2 },
      'zyvan.delivery.retry.10s'
    );
    // Did NOT execute webhook again
    expect(httpClient.sendWebhook).not.toHaveBeenCalled();
  });
});
