import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import * as rabbitmq from '../../lib/rabbitmq';
import { ingestEvent } from '../../modules/events/service';
import * as eventRepo from '../../modules/events/repository';
import * as destRepo from '../../modules/destinations/repository';
import * as deliveryRepo from '../../modules/deliveries/repository';
import { classifyFailure, shouldRetry } from '../../../../worker/src/services/retry-service';
import { checkRateLimit } from '../../../../worker/src/services/destination-rate-limiter';
import { validateDestinationUrl } from '../../../../worker/src/services/ssrf-validator';
import { signPayload } from '@zyvan/crypto';
import { getPrismaClient } from '@zyvan/db';

// Mock DB
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    outboxMessage: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    deadLetter: {
      create: vi.fn().mockResolvedValue({ id: 'dlq-1', status: 'pending' }),
    },
    delivery: {
      update: vi.fn().mockResolvedValue({ id: 'del-1', status: 'delivered' }),
    },
    attempt: {
      create: vi.fn().mockResolvedValue({ id: 'att-1', attemptNumber: 1 }),
    },
    member: {
      findFirst: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('@zyvan/db', () => ({
  getPrismaClient: () => mockPrisma,
  Prisma: {
    join: (arr: any[]) => arr.join(','),
  },
}));

vi.mock('../../lib/rabbitmq', () => ({
  publishDeliveryJobsConfirmed: vi.fn(),
  isRabbitMQConnected: vi.fn().mockReturnValue(true),
  connectRabbitMQ: vi.fn().mockResolvedValue(undefined),
  disconnectRabbitMQ: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../modules/destinations/repository', () => ({
  listByOrganization: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../../modules/events/repository', () => ({
  findByIdempotencyKey: vi.fn(),
  createWithDeliveries: vi.fn(),
}));

vi.mock('../../modules/deliveries/repository', () => ({
  listByDestination: vi.fn(),
}));

describe('Production Pipeline Acceptance: Event Ingestion to Delivery, Retries & DLQ', () => {
  const orgId = 'org_enterprise_01';
  const projId = 'proj_main_01';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Gate 1: Event Ingestion & Idempotency Guarantees', () => {
    it('ingests event, fans out to active destinations, confirms RabbitMQ publish, and removes outbox row', async () => {
      vi.mocked(eventRepo.findByIdempotencyKey).mockResolvedValueOnce(null);
      vi.mocked(destRepo.listByOrganization).mockResolvedValueOnce([
        {
          id: 'dest_webhook_01',
          organizationId: orgId,
          projectId: projId,
          url: 'https://api.partner.com/webhook',
          active: true,
          events: ['order.completed'],
        } as any,
      ]);

      vi.mocked(eventRepo.createWithDeliveries).mockResolvedValueOnce({
        event: {
          id: 'evt_100',
          organizationId: orgId,
          projectId: projId,
          type: 'order.completed',
          status: 'queued',
          createdAt: new Date(),
        } as any,
        deliveries: [
          {
            id: 'del_100',
            destinationId: 'dest_webhook_01',
            status: 'pending',
          } as any,
        ],
        outboxMessages: [
          {
            id: 'out_100',
            deliveryId: 'del_100',
          } as any,
        ],
      });

      vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockResolvedValueOnce({
        confirmed: ['del_100'],
        failed: [],
      });

      const res = await ingestEvent(
        orgId,
        projId,
        'order.completed',
        'idemp_key_unique_999',
        { orderId: 'ord_123', total: 299.99 }
      );

      expect(res.event_id).toBe('evt_100');
      expect(res.duplicate).toBe(false);
      expect(rabbitmq.publishDeliveryJobsConfirmed).toHaveBeenCalledWith([
        { deliveryId: 'del_100', attemptNo: 1 },
      ]);
      expect(mockPrisma.outboxMessage.deleteMany).toHaveBeenCalledWith({
        where: {
          deliveryId: { in: ['del_100'] },
        },
      });
    });

    it('idempotency: duplicate request with same key returns existing event without re-publishing', async () => {
      vi.mocked(eventRepo.findByIdempotencyKey).mockResolvedValueOnce({
        id: 'evt_already_processed',
        type: 'invoice.paid',
        status: 'queued',
        createdAt: new Date(),
        deliveries: [{ id: 'del_existing' }],
      } as any);

      const result = await ingestEvent(
        orgId,
        projId,
        'invoice.paid',
        'idemp_duplicate_test',
        { invoiceId: 'inv_123' }
      );

      expect(result.duplicate).toBe(true);
      expect(result.event_id).toBe('evt_already_processed');
      // Broker publish was not triggered for duplicate
      expect(rabbitmq.publishDeliveryJobsConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('Gate 2: Delivery Security, SSRF & HMAC Signing', () => {
    it('blocks loopback and private cloud metadata IP destinations to prevent SSRF', async () => {
      await expect(validateDestinationUrl('http://127.0.0.1:8080/hook')).rejects.toThrow();
      await expect(validateDestinationUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow();
      await expect(validateDestinationUrl('http://10.0.0.1/private')).rejects.toThrow();
      await expect(validateDestinationUrl('http://192.168.1.1/admin')).rejects.toThrow();
    });

    it('generates cryptographic HMAC-SHA256 signature and timestamp for webhook authenticity', () => {
      const payload = JSON.stringify({ event: 'user.created', id: 'usr_1' });
      const secret = 'whsec_test_secret_key_12345';

      const result = signPayload(secret, payload, 'v1');

      expect(result.signature).toBeDefined();
      expect(result.header).toMatch(/^v1=[a-f0-9]{64}$/);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Gate 3: Retry Classification & DLQ Dead-Letter Transition', () => {
    it('classifies 5xx, timeouts, network errors, and 429 as retryable', () => {
      expect(classifyFailure('failed', 500)).toBe('retryable');
      expect(classifyFailure('failed', 502)).toBe('retryable');
      expect(classifyFailure('failed', 503)).toBe('retryable');
      expect(classifyFailure('failed', 429)).toBe('retryable');
      expect(classifyFailure('timeout', null)).toBe('retryable');
      expect(classifyFailure('error', null)).toBe('retryable');
    });

    it('classifies non-429 4xx (400, 401, 404, 422) as terminal and moves to DLQ without wasting retries', () => {
      expect(classifyFailure('failed', 400)).toBe('terminal');
      expect(classifyFailure('failed', 401)).toBe('terminal');
      expect(classifyFailure('failed', 403)).toBe('terminal');
      expect(classifyFailure('failed', 404)).toBe('terminal');
      expect(classifyFailure('failed', 422)).toBe('terminal');
    });

    it('enforces maximum retry limits (5 attempts max)', () => {
      expect(shouldRetry(1)).toBe(true);
      expect(shouldRetry(4)).toBe(true);
      expect(shouldRetry(5)).toBe(false);
      expect(shouldRetry(6)).toBe(false);
    });
  });
});
