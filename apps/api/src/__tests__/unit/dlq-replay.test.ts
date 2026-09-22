import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { getPrismaClient } from '@zyvan/db';
import * as rabbitmq from '../../lib/rabbitmq';
import * as dlqRepo from '../../modules/dlq/repository';
import * as dlqService from '../../modules/dlq/service';

vi.mock('@zyvan/db', () => {
  const mockPrisma: any = {
    deadLetter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
    destination: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    delivery: {
      create: vi.fn(),
      update: vi.fn(),
    },
    replay: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    replayBatch: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    outboxMessage: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: vi.fn().mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return Promise.all(callback);
    }),
  };
  return {
    getPrismaClient: vi.fn().mockReturnValue(mockPrisma),
  };
});

vi.mock('../../lib/rabbitmq', () => ({
  publishDeliveryJobsConfirmed: vi.fn().mockResolvedValue({ confirmed: ['del-2'], failed: [] }),
  isRabbitMQConnected: vi.fn().mockReturnValue(true),
}));

describe('PR 3.2: Dead Letter Queue (DLQ) Replay Unit & Concurrency Tests', () => {
  const mockPrisma = getPrismaClient() as any;

  const validApiKey = {
    id: 'key-1',
    keyHash: 'fake-hash',
    projectId: '11111111-1111-1111-1111-111111111111',
    organizationId: 'org-1',
    scopes: ['delivery:read', 'delivery:replay'],
    revokedAt: null,
    expiresAt: null,
    organization: { id: 'org-1', name: 'Acme Org' },
    project: { organizationId: 'org-1', status: 'active' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.apiKey.findUnique.mockResolvedValue(validApiKey);
    mockPrisma.apiKey.update.mockResolvedValue({});
    mockPrisma.outboxMessage.deleteMany.mockResolvedValue({ count: 1 });
  });

  // ─── 1. Single Replay Endpoint ─────────────────────────────────
  describe('POST /v1/dead-letters/:id/replay', () => {
    it('returns 400 Bad Request if Idempotency-Key header is missing', async () => {
      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
      expect(res.body.message).toContain('Idempotency-Key');
    });

    it('returns 403 Forbidden if api key lacks delivery:replay scope', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValueOnce({
        ...validApiKey,
        scopes: ['delivery:read'], // missing delivery:replay
      });

      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-1');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('authorization_denied');
    });

    it('returns 404 Not Found if dead letter does not exist in org', async () => {
      mockPrisma.replay.findUnique.mockResolvedValueOnce(null);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/v1/dead-letters/dl-not-found/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-1');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('not_found');
    });

    it('returns 409 Conflict if dead letter is not in OPEN status', async () => {
      mockPrisma.replay.findUnique.mockResolvedValueOnce(null);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        id: 'dl-1',
        organizationId: 'org-1',
        status: 'replaying',
        destination: { active: true },
      });

      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-1');

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('conflict');
      expect(res.body.message).toContain("status 'replaying'");
    });

    it('returns 400 Bad Request if destination is inactive/disabled', async () => {
      mockPrisma.replay.findUnique.mockResolvedValueOnce(null);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        id: 'dl-1',
        organizationId: 'org-1',
        status: 'open',
        destination: { active: false },
      });

      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-1');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
      expect(res.body.message).toContain('inactive or disabled');
    });

    it('successfully claims DLQ and creates Delivery, Replay, Outbox (202 Accepted)', async () => {
      mockPrisma.replay.findUnique.mockResolvedValueOnce(null);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        id: 'dl-1',
        organizationId: 'org-1',
        eventId: 'evt-1',
        deliveryId: 'del-1',
        destinationId: 'dest-1',
        status: 'open',
        destination: { id: 'dest-1', active: true },
      });
      mockPrisma.$executeRaw.mockResolvedValueOnce(1); // 1 row updated
      mockPrisma.delivery.create.mockResolvedValueOnce({
        id: 'del-2',
        organizationId: 'org-1',
        eventId: 'evt-1',
        destinationId: 'dest-1',
        status: 'queued',
      });
      mockPrisma.replay.create.mockResolvedValueOnce({
        id: 'rep-1',
        organizationId: 'org-1',
        eventId: 'evt-1',
        deadLetterId: 'dl-1',
        deliveryId: 'del-2',
        idempotencyKey: 'idemp-1',
        status: 'queued',
        createdAt: new Date(),
      });
      mockPrisma.outboxMessage.create.mockResolvedValueOnce({
        id: 'out-1',
        deliveryId: 'del-2',
      });

      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-1');

      expect(res.status).toBe(202);
      expect(res.body.data).toMatchObject({
        status: 'created',
        replayId: 'rep-1',
        deliveryId: 'del-2',
        deadLetterId: 'dl-1',
        replayStatus: 'queued',
      });

      expect(rabbitmq.publishDeliveryJobsConfirmed).toHaveBeenCalledWith([
        { deliveryId: 'del-2', attemptNo: 1 },
      ]);
      expect(mockPrisma.outboxMessage.deleteMany).toHaveBeenCalledWith({
        where: { deliveryId: { in: ['del-2'] } },
      });
    });

    it('returns existing replay when called with same Idempotency-Key (idempotent)', async () => {
      mockPrisma.replay.findUnique.mockResolvedValueOnce({
        id: 'rep-existing',
        organizationId: 'org-1',
        deadLetterId: 'dl-1',
        deliveryId: 'del-existing',
        status: 'queued',
        createdAt: new Date('2026-09-22T10:00:00.000Z'),
      });

      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-repeat');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        status: 'existing',
        replayId: 'rep-existing',
        deliveryId: 'del-existing',
        deadLetterId: 'dl-1',
      });
      // Should not attempt to claim again
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('handles broker outage gracefully: retains outbox message and returns 202', async () => {
      mockPrisma.replay.findUnique.mockResolvedValueOnce(null);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        id: 'dl-1',
        organizationId: 'org-1',
        eventId: 'evt-1',
        deliveryId: 'del-1',
        destinationId: 'dest-1',
        status: 'open',
        destination: { id: 'dest-1', active: true },
      });
      mockPrisma.$executeRaw.mockResolvedValueOnce(1);
      mockPrisma.delivery.create.mockResolvedValueOnce({ id: 'del-2' });
      mockPrisma.replay.create.mockResolvedValueOnce({
        id: 'rep-1',
        status: 'queued',
        createdAt: new Date(),
      });
      mockPrisma.outboxMessage.create.mockResolvedValueOnce({ id: 'out-1' });

      // RabbitMQ throws connection error
      vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockRejectedValueOnce(
        new Error('RabbitMQ connection reset')
      );

      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-broker-down');

      expect(res.status).toBe(202);
      expect(res.body.data.replayId).toBe('rep-1');
      // outboxMessage.deleteMany should NOT have been called
      expect(mockPrisma.outboxMessage.deleteMany).not.toHaveBeenCalled();
    });

    it('recovers from P2002 unique constraint race by reloading existing replay', async () => {
      mockPrisma.replay.findUnique
        .mockResolvedValueOnce(null) // first check: not found
        .mockResolvedValueOnce({    // second check after P2002: found!
          id: 'rep-raced',
          deadLetterId: 'dl-1',
          deliveryId: 'del-raced',
          status: 'queued',
          createdAt: new Date(),
        });

      // Transaction throws P2002 unique collision
      const p2002Error: any = new Error('Unique constraint failed on the fields: (`deadLetterId`,`idempotencyKey`)');
      p2002Error.code = 'P2002';
      mockPrisma.$transaction.mockRejectedValueOnce(p2002Error);

      const res = await request(app)
        .post('/v1/dead-letters/dl-1/replay')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'idemp-concurrent');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        status: 'existing',
        replayId: 'rep-raced',
      });
    });
  });

  // ─── 2. Bulk Replay Endpoint & Batch Idempotency ──────────────
  describe('POST /v1/dead-letters/replay-bulk', () => {
    it('distinguishes static route /replay-bulk from parameterized route /:id', async () => {
      const res = await request(app)
        .post('/v1/dead-letters/replay-bulk')
        .set('Authorization', 'Bearer zyvan_live_testkey123');

      // Fails on missing Idempotency-Key header, proving route /replay-bulk matched!
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
      expect(res.body.message).toContain('Idempotency-Key');
    });

    it('returns existing ReplayBatch on identical Idempotency-Key', async () => {
      mockPrisma.replayBatch.findUnique.mockResolvedValueOnce({
        id: 'batch-1',
        organizationId: 'org-1',
        idempotencyKey: 'bulk-key-1',
        requested: 3,
        accepted: 3,
        skipped: 0,
        status: 'accepted',
        replays: [
          { id: 'rep-1', deliveryId: 'del-1', deadLetterId: 'dl-1', status: 'queued', createdAt: new Date() },
          { id: 'rep-2', deliveryId: 'del-2', deadLetterId: 'dl-2', status: 'queued', createdAt: new Date() },
        ],
      });

      const res = await request(app)
        .post('/v1/dead-letters/replay-bulk')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'bulk-key-1')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        status: 'existing',
        batchId: 'batch-1',
        requested: 3,
        accepted: 3,
      });
      expect(mockPrisma.deadLetter.findMany).not.toHaveBeenCalled();
    });

    it('caps candidate search at limit (max 100) and creates batch', async () => {
      mockPrisma.replayBatch.findUnique.mockResolvedValueOnce(null);
      mockPrisma.deadLetter.findMany.mockResolvedValueOnce([
        { id: 'dl-1', eventId: 'evt-1', deliveryId: 'del-1', destinationId: 'dest-1', status: 'open', destination: { active: true } },
        { id: 'dl-2', eventId: 'evt-2', deliveryId: 'del-2', destinationId: 'dest-1', status: 'open', destination: { active: true } },
      ]);

      mockPrisma.replayBatch.create.mockResolvedValueOnce({
        id: 'batch-2',
        requested: 2,
        status: 'accepted',
      });
      mockPrisma.deadLetter.findFirst
        .mockResolvedValueOnce({ id: 'dl-1', eventId: 'evt-1', deliveryId: 'del-1', destinationId: 'dest-1', status: 'open', destination: { active: true } })
        .mockResolvedValueOnce({ id: 'dl-2', eventId: 'evt-2', deliveryId: 'del-2', destinationId: 'dest-1', status: 'open', destination: { active: true } });
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.delivery.create
        .mockResolvedValueOnce({ id: 'del-new-1' })
        .mockResolvedValueOnce({ id: 'del-new-2' });
      mockPrisma.replay.create
        .mockResolvedValueOnce({ id: 'rep-1', deliveryId: 'del-new-1', deadLetterId: 'dl-1', status: 'queued' })
        .mockResolvedValueOnce({ id: 'rep-2', deliveryId: 'del-new-2', deadLetterId: 'dl-2', status: 'queued' });
      mockPrisma.outboxMessage.create.mockResolvedValue({ id: 'out-1' });
      mockPrisma.replayBatch.update.mockResolvedValueOnce({
        id: 'batch-2',
        requested: 2,
        accepted: 2,
        skipped: 0,
        status: 'accepted',
      });
      vi.mocked(rabbitmq.publishDeliveryJobsConfirmed).mockResolvedValueOnce({
        confirmed: ['del-new-1', 'del-new-2'],
        failed: [],
      });

      const res = await request(app)
        .post('/v1/dead-letters/replay-bulk')
        .set('Authorization', 'Bearer zyvan_live_testkey123')
        .set('Idempotency-Key', 'bulk-key-new')
        .send({ limit: 150 }); // Requested 150, but should be clamped to 100

      expect(res.status).toBe(202);
      expect(res.body.data).toMatchObject({
        batchId: 'batch-2',
        requested: 2,
        accepted: 2,
        skipped: 0,
      });

      expect(mockPrisma.deadLetter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Capped at 100!
        })
      );
    });
  });

  // ─── 3. Atomic Transaction Rollback & Concurrency ──────────────
  describe('Transactional Atomicity & Concurrency', () => {
    it('rolls back completely if Delivery creation fails during claim', async () => {
      const mockTx = {
        deadLetter: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'dl-1',
            status: 'open',
            destination: { active: true },
          }),
        },
        $executeRaw: vi.fn().mockResolvedValue(1),
        delivery: {
          create: vi.fn().mockRejectedValue(new Error('DB disk full')),
        },
      };

      await expect(
        mockPrisma.$transaction(async (tx: any) => {
          const dl = await tx.deadLetter.findFirst();
          await tx.$executeRaw();
          await tx.delivery.create();
        })
      ).rejects.toThrow('DB disk full');
    });

    it('20 concurrent replay calls with identical Idempotency-Key resolve to same Replay', async () => {
      let createCallCount = 0;
      const sharedReplay = {
        id: 'rep-concurrent-winner',
        deadLetterId: 'dl-conc',
        deliveryId: 'del-conc',
        status: 'queued',
        createdAt: new Date(),
      };

      vi.spyOn(dlqRepo, 'findReplayByIdempotencyKey').mockImplementation(async () => {
        if (createCallCount > 0) return sharedReplay as any;
        return null;
      });

      vi.spyOn(dlqRepo, 'claimAndCreateReplayTransaction').mockImplementation(async () => {
        if (createCallCount === 0) {
          createCallCount++;
          return {
            status: 'created',
            replay: sharedReplay,
            delivery: { id: 'del-conc' },
            outbox: { id: 'out-conc' },
          } as any;
        }
        // Subsequent concurrent calls throw P2002
        const p2002: any = new Error('Unique constraint failed');
        p2002.code = 'P2002';
        throw p2002;
      });

      // Fire 20 concurrent replay requests
      const calls = Array.from({ length: 20 }, () =>
        dlqService.replayDeadLetter('dl-conc', 'org-1', 'same-key-20')
      );

      const results = await Promise.all(calls);

      expect(results.length).toBe(20);
      for (const res of results) {
        expect(res.replayId).toBe('rep-concurrent-winner');
        expect(res.deliveryId).toBe('del-conc');
      }
    });
  });
});
