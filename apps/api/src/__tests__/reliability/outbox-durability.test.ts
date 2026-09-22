import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestEvent } from '../../modules/events/service';
import { OutboxReconciler } from '../../services/outbox-reconciler';
import { getPrismaClient } from '@zyvan/db';
import * as rabbitmq from '../../lib/rabbitmq';
import * as eventRepo from '../../modules/events/repository';
import * as destRepo from '../../modules/destinations/repository';

vi.mock('../../lib/rabbitmq', () => ({
  publishDeliveryJobsConfirmed: vi.fn(),
  isRabbitMQConnected: vi.fn().mockReturnValue(true),
}));

vi.mock('../../modules/destinations/repository', () => ({
  listByOrganization: vi.fn(),
}));

vi.mock('../../modules/events/repository', () => ({
  findByIdempotencyKey: vi.fn(),
  createWithDeliveries: vi.fn(),
}));

vi.mock('@zyvan/db', () => {
  const mockPrisma = {
    outboxMessage: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  return {
    getPrismaClient: vi.fn().mockReturnValue(mockPrisma),
    Prisma: {
      join: (arr: any[]) => arr.join(','),
    },
  };
});

describe('PR 2.10: Outbox Durability & Reconciler Recovery Tests', () => {
  const mockPrisma = getPrismaClient() as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario I & J: Ingestion writes outbox in transaction, confirms publish, and cleans up outbox', async () => {
    vi.mocked(eventRepo.findByIdempotencyKey).mockResolvedValueOnce(null);
    vi.mocked(destRepo.listByOrganization).mockResolvedValueOnce([
      { id: 'dest-1', active: true } as any,
    ]);

    vi.mocked(eventRepo.createWithDeliveries).mockResolvedValueOnce({
      event: { id: 'evt-100', status: 'queued', createdAt: new Date() } as any,
      deliveries: [{ id: 'del-100', destinationId: 'dest-1' }] as any,
      outboxMessages: [{ id: 'out-100', deliveryId: 'del-100' }] as any,
    });

    vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockResolvedValueOnce({
      confirmed: ['del-100'],
      failed: [],
    });

    const result = await ingestEvent(
      'org-1',
      'proj-1',
      'order.created',
      'idemp-100',
      { amount: 99.99 }
    );

    expect(result.event_id).toBe('evt-100');
    expect(result.duplicate).toBe(false);

    // Verified published with confirms
    expect(rabbitmq.publishDeliveryJobsConfirmed).toHaveBeenCalledWith([
      { deliveryId: 'del-100', attemptNo: 1 },
    ]);

    // Verified outbox row deleted after broker confirms
    expect(mockPrisma.outboxMessage.deleteMany).toHaveBeenCalledWith({
      where: {
        deliveryId: { in: ['del-100'] },
      },
    });
  });

  it('Scenario K: Failed broker publish leaves outbox row for reconciler to discover and recover', async () => {
    // 1. Ingestion fails to confirm with broker
    vi.mocked(eventRepo.findByIdempotencyKey).mockResolvedValueOnce(null);
    vi.mocked(destRepo.listByOrganization).mockResolvedValueOnce([
      { id: 'dest-1', active: true } as any,
    ]);

    vi.mocked(eventRepo.createWithDeliveries).mockResolvedValueOnce({
      event: { id: 'evt-200', status: 'queued', createdAt: new Date() } as any,
      deliveries: [{ id: 'del-200', destinationId: 'dest-1' }] as any,
      outboxMessages: [{ id: 'out-200', deliveryId: 'del-200' }] as any,
    });

    vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockResolvedValueOnce({
      confirmed: [],
      failed: ['del-200'], // Broker timed out or nacked
    });

    await ingestEvent(
      'org-1',
      'proj-1',
      'payment.received',
      'idemp-200',
      { amount: 50 }
    );

    // Outbox was NOT deleted
    expect(mockPrisma.outboxMessage.deleteMany).not.toHaveBeenCalled();

    // 2. Outbox Reconciler runs its tick, claims orphaned row and successfully publishes
    const reconciler = new OutboxReconciler({
      pollIntervalMs: 100,
      batchSize: 10,
      leaseDurationSeconds: 60,
    });

    mockPrisma.$queryRaw.mockResolvedValueOnce([
      { id: 'out-200', delivery_id: 'del-200', organization_id: 'org-1', attempts: 1 },
    ]);

    vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockResolvedValueOnce({
      confirmed: ['del-200'],
      failed: [],
    });

    const recoveredCount = await reconciler.tick();
    expect(recoveredCount).toBe(1);

    // Confirmed row deleted by reconciler
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();

    await reconciler.stop();
  });
});
