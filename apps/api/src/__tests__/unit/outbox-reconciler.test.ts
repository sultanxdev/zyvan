import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutboxReconciler } from '../../services/outbox-reconciler';
import * as rabbitmq from '../../lib/rabbitmq';
import { getPrismaClient } from '@zyvan/db';

vi.mock('../../lib/rabbitmq', () => ({
  publishDeliveryJobsConfirmed: vi.fn(),
  isRabbitMQConnected: vi.fn().mockReturnValue(true),
}));

vi.mock('@zyvan/db', () => {
  const mockPrisma = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  };
  return {
    getPrismaClient: vi.fn().mockReturnValue(mockPrisma),
    Prisma: {
      join: (arr: any[]) => arr.join(','),
    },
  };
});

describe('OutboxReconciler Unit Tests', () => {
  let reconciler: OutboxReconciler;
  const mockPrisma = getPrismaClient() as any;

  beforeEach(() => {
    vi.clearAllMocks();
    reconciler = new OutboxReconciler({
      pollIntervalMs: 100,
      batchSize: 10,
      leaseDurationSeconds: 60,
      heartbeatIntervalMs: 500,
      maxAttempts: 5,
    });
  });

  afterEach(async () => {
    await reconciler.stop();
  });

  it('skips processing if RabbitMQ is not connected', async () => {
    vi.mocked(rabbitmq.isRabbitMQConnected).mockReturnValueOnce(false);
    const count = await reconciler.tick();
    expect(count).toBe(0);
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns 0 if no outbox messages are claimed', async () => {
    vi.mocked(rabbitmq.isRabbitMQConnected).mockReturnValue(true);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);

    const count = await reconciler.tick();
    expect(count).toBe(0);
    expect(rabbitmq.publishDeliveryJobsConfirmed).not.toHaveBeenCalled();
  });

  it('publishes claimed messages and deletes confirmed outbox records', async () => {
    vi.mocked(rabbitmq.isRabbitMQConnected).mockReturnValue(true);

    const claimedRows = [
      { id: 'out-1', delivery_id: 'del-1', organization_id: 'org-1', attempts: 1 },
      { id: 'out-2', delivery_id: 'del-2', organization_id: 'org-1', attempts: 1 },
    ];
    mockPrisma.$queryRaw.mockResolvedValueOnce(claimedRows);

    vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockResolvedValueOnce({
      confirmed: ['del-1', 'del-2'],
      failed: [],
    });
    mockPrisma.$executeRaw.mockResolvedValue(2);

    const count = await reconciler.tick();

    expect(count).toBe(2);
    expect(rabbitmq.publishDeliveryJobsConfirmed).toHaveBeenCalledWith([
      { deliveryId: 'del-1', attemptNo: 1 },
      { deliveryId: 'del-2', attemptNo: 1 },
    ]);
    // Expect delete execution for confirmed records
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it('releases lock when publishing fails', async () => {
    vi.mocked(rabbitmq.isRabbitMQConnected).mockReturnValue(true);

    const claimedRows = [
      { id: 'out-1', delivery_id: 'del-1', organization_id: 'org-1', attempts: 1 },
    ];
    mockPrisma.$queryRaw.mockResolvedValueOnce(claimedRows);

    vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockResolvedValueOnce({
      confirmed: [],
      failed: ['del-1'],
    });
    mockPrisma.$executeRaw.mockResolvedValue(1);

    const count = await reconciler.tick();

    expect(count).toBe(0);
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });
});
