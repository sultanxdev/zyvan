import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDelivery, moveToDLQ } from '../../services/delivery-service';
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
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    event: {
      update: vi.fn().mockResolvedValue({}),
    },
    attempt: {
      create: vi.fn().mockResolvedValue({ id: 'att-1' }),
      update: vi.fn().mockResolvedValue({ id: 'att-1' }),
    },
    replay: {
      update: vi.fn().mockResolvedValue({}),
    },
    deadLetter: {
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $transaction: vi.fn().mockImplementation((actions) => Promise.all(actions)),
  };
  return {
    getPrismaClient: vi.fn().mockReturnValue(mockPrisma),
  };
});

describe('PR 3.2: Worker DLQ Replay Resolution & Lineage Unit Tests', () => {
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

  // ─── 1. Replay Success Resolution ──────────────────────────────
  describe('Successful Replay Delivery (HTTP 2xx)', () => {
    it('atomically resolves Delivery, Replay, and original DeadLetter on HTTP 200', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValueOnce({
        id: 'del-replay-1',
        organizationId: 'org-1',
        status: 'queued',
        attemptCount: 0,
        event: { id: 'evt-1' },
        destination: {
          id: 'dest-1',
          url: 'https://webhook.site/test',
          active: true,
          secret: 'sec_123',
          rateLimit: 100,
          organization: { id: 'org-1', name: 'Acme' },
        },
        replay: {
          id: 'rep-1',
          deadLetterId: 'dl-orig-1',
          requestedBy: 'user-shekh',
        },
      });

      vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
        success: true,
        statusCode: 200,
        latencyMs: 85,
        outcome: 'success',
      });

      const handled = await processDelivery(
        { deliveryId: 'del-replay-1', attemptNo: 1 },
        'test-enc-key',
        'v1',
        mockLogger
      );

      expect(handled).toBe(true);

      // Verify atomic transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // 1. Delivery -> delivered
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-replay-1' },
          data: expect.objectContaining({
            status: 'delivered',
            attemptCount: 1,
            lastStatusCode: 200,
          }),
        })
      );

      // 2. Replay -> resolved
      expect(mockPrisma.replay.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rep-1' },
          data: expect.objectContaining({
            status: 'resolved',
            completedAt: expect.any(Date),
          }),
        })
      );

      // 3. Original DeadLetter -> resolved
      expect(mockPrisma.deadLetter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dl-orig-1' },
          data: expect.objectContaining({
            status: 'resolved',
            resolvedAt: expect.any(Date),
            resolvedBy: 'user-shekh',
            resolution: 'Resolved via successful replay',
          }),
        })
      );
    });
  });

  // ─── 2. Replay Failure & Lineage Preservation ─────────────────
  describe('Failed Replay Delivery & Lineage Preservation', () => {
    it('resets original DeadLetter status to open WITHOUT overwriting original history, and creates new DeadLetter', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValueOnce({
        id: 'del-replay-fail',
        organizationId: 'org-1',
        status: 'queued',
        attemptCount: 0,
        event: { id: 'evt-1' },
        destination: {
          id: 'dest-1',
          url: 'https://webhook.site/test',
          active: true,
          secret: 'sec_123',
          rateLimit: 100,
          retryPolicy: { maxAttempts: 1 }, // No retries -> goes straight to DLQ
          organization: { id: 'org-1', name: 'Acme' },
        },
        replay: {
          id: 'rep-fail-1',
          deadLetterId: 'dl-orig-preserve',
        },
      });

      vi.mocked(httpClient.sendWebhook).mockResolvedValueOnce({
        success: false,
        statusCode: 400,
        latencyMs: 120,
        outcome: 'failed',
        error: 'Bad Request from endpoint',
      });

      const handled = await processDelivery(
        { deliveryId: 'del-replay-fail', attemptNo: 1 },
        'test-enc-key',
        'v1',
        mockLogger
      );

      expect(handled).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // 1. Delivery -> failed
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-replay-fail' },
          data: expect.objectContaining({
            status: 'failed',
            lastStatusCode: 400,
          }),
        })
      );

      // 2. Replay -> failed with reason
      expect(mockPrisma.replay.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rep-fail-1' },
          data: expect.objectContaining({
            status: 'failed',
            failureReason: expect.stringContaining('Terminal HTTP 400'),
            completedAt: expect.any(Date),
          }),
        })
      );

      // 3. Original DeadLetter -> status reset to open ONLY!
      // Invariant: original reason, errorMessage, statusCode, and attemptCount MUST NOT be modified!
      expect(mockPrisma.deadLetter.update).toHaveBeenCalledWith({
        where: { id: 'dl-orig-preserve' },
        data: {
          status: 'open',
        },
      });

      // 4. New DeadLetter record created for this replayed delivery
      expect(mockPrisma.deadLetter.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryId: 'del-replay-fail' },
          create: expect.objectContaining({
            organizationId: 'org-1',
            eventId: 'evt-1',
            deliveryId: 'del-replay-fail',
            destinationId: 'dest-1',
            status: 'open',
            statusCode: 400,
            attemptCount: 1,
          }),
        })
      );
    });

    it('moveToDLQ directly supports non-replay deliveries without touching replay models', async () => {
      await moveToDLQ(
        {
          delivery: {
            id: 'del-standard',
            organizationId: 'org-1',
            eventId: 'evt-1',
            destinationId: 'dest-1',
          },
          reason: 'terminal_4xx',
          errorMessage: 'HTTP 404 Not Found',
          statusCode: 404,
          attemptCount: 1,
        },
        mockPrisma
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-standard' },
          data: expect.objectContaining({ status: 'failed' }),
        })
      );
      expect(mockPrisma.replay.update).not.toHaveBeenCalled();
      expect(mockPrisma.deadLetter.update).not.toHaveBeenCalled();
      expect(mockPrisma.deadLetter.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryId: 'del-standard' },
        })
      );
    });
  });
});
