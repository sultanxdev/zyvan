import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDelivery } from '../../services/delivery-service';
import { getPrismaClient } from '@zyvan/db';
import * as rabbitmq from '../../lib/rabbitmq';
import * as httpClient from '../../services/http-client';

vi.mock('../../lib/rabbitmq', () => ({
  publishTieredRetryJobConfirmed: vi.fn(),
}));

vi.mock('../../services/http-client', () => ({
  sendWebhook: vi.fn(),
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
    $executeRaw: vi.fn(),
    $transaction: vi.fn().mockImplementation((actions) => Promise.all(actions)),
  };
  return {
    getPrismaClient: vi.fn().mockReturnValue(mockPrisma),
  };
});

describe('Delivery State Machine Unit Tests', () => {
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

  it('discards and acks if delivery not found', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce(null);

    const result = await processDelivery(
      { deliveryId: 'del-1', attemptNo: 1 },
      'test-key',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: 'del-1' }),
      expect.stringContaining('Delivery not found')
    );
  });

  it('skips and acks if delivery is already terminal (delivered)', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-1',
      status: 'delivered',
      attemptCount: 1,
    });

    const result = await processDelivery(
      { deliveryId: 'del-1', attemptNo: 1 },
      'test-key',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('recovers retrying delivery from crash window by republishing retry job', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-1',
      status: 'retrying',
      attemptCount: 1,
      destination: { active: true },
      event: { payload: {} },
    });
    vi.mocked(rabbitmq.publishTieredRetryJobConfirmed).mockResolvedValueOnce();

    const result = await processDelivery(
      { deliveryId: 'del-1', attemptNo: 1 },
      'test-key',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    expect(rabbitmq.publishTieredRetryJobConfirmed).toHaveBeenCalledWith(
      { deliveryId: 'del-1', attemptNo: 2 },
      'zyvan.delivery.retry.10s'
    );
  });

  it('skips stale attempt message when db attempt count is ahead', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-1',
      status: 'queued',
      attemptCount: 3,
      destination: { active: true },
    });

    const result = await processDelivery(
      { deliveryId: 'del-1', attemptNo: 2 }, // incoming is attempt 2, but DB is at 3
      'test-key',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('processes successful delivery: updates status to delivered and acks', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-1',
      status: 'queued',
      attemptCount: 0,
      destination: {
        active: true,
        url: 'https://example.com/webhook',
        secretRef: 'sec-1',
      },
      event: { id: 'evt-1', payload: { foo: 'bar' } },
    });
    mockPrisma.$executeRaw.mockResolvedValueOnce(1); // Claim succeeded
    vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
      success: true,
      statusCode: 200,
      latencyMs: 45,
      outcome: 'success',
      responseBody: 'OK',
    } as any);
    mockPrisma.delivery.findMany.mockResolvedValueOnce([{ status: 'delivered' }]);

    const result = await processDelivery(
      { deliveryId: 'del-1', attemptNo: 1 },
      'test-key',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-1' },
        data: expect.objectContaining({ status: 'delivered', attemptCount: 1 }),
      })
    );
  });

  it('moves terminal 400 error to PostgreSQL DeadLetter immediately', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-1',
      status: 'queued',
      attemptCount: 0,
      destination: {
        active: true,
        url: 'https://example.com/webhook',
        secretRef: 'sec-1',
      },
      event: { id: 'evt-1', payload: {} },
    });
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
      success: false,
      statusCode: 400,
      latencyMs: 20,
      outcome: 'failed',
      error: 'Bad Request',
    } as any);

    const result = await processDelivery(
      { deliveryId: 'del-1', attemptNo: 1 },
      'test-key',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    expect(mockPrisma.deadLetter.upsert).toHaveBeenCalled();
  });

  it('handles retryable 500 failure by updating DB to retrying and publishing to tier 10s', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValueOnce({
      id: 'del-1',
      status: 'queued',
      attemptCount: 0,
      destination: {
        active: true,
        url: 'https://example.com/webhook',
        secretRef: 'sec-1',
        retryPolicy: { maxAttempts: 5 },
      },
      event: { id: 'evt-1', payload: {} },
    });
    mockPrisma.$executeRaw.mockResolvedValueOnce(1);
    vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
      success: false,
      statusCode: 500,
      latencyMs: 120,
      outcome: 'failed',
      error: 'Internal Server Error',
    } as any);
    vi.mocked(rabbitmq.publishTieredRetryJobConfirmed).mockResolvedValueOnce();

    const result = await processDelivery(
      { deliveryId: 'del-1', attemptNo: 1 },
      'test-key',
      'v1',
      mockLogger
    );

    expect(result).toBe(true);
    // Verified DB updated first to retrying
    expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-1' },
        data: expect.objectContaining({ status: 'retrying', attemptCount: 1 }),
      })
    );
    // Verified published to tiered retry queue
    expect(rabbitmq.publishTieredRetryJobConfirmed).toHaveBeenCalledWith(
      { deliveryId: 'del-1', attemptNo: 2 },
      'zyvan.delivery.retry.10s'
    );
  });
});
