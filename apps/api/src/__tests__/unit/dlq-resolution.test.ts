import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { getPrismaClient } from '@zyvan/db';
import * as dlqRepo from '../../modules/dlq/repository';

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
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
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
    Prisma: {
      join: vi.fn().mockImplementation((arr) => arr),
      sql: vi.fn().mockImplementation((strings, ...values) => `${strings[0]}${values.join('')}${strings[1] || ''}`),
    },
  };
});

describe('PR 3.3: Dead-Letter Manual Resolution & Dismissal Engine Tests', () => {
  const mockPrisma = getPrismaClient() as any;

  const validManageApiKey = {
    id: 'key-manage-1',
    keyHash: 'fake-hash',
    projectId: '11111111-1111-1111-1111-111111111111',
    organizationId: 'org-1',
    scopes: ['delivery:read', 'delivery:manage'],
    revokedAt: null,
    expiresAt: null,
    organization: { id: 'org-1', name: 'Acme Org' },
    project: { organizationId: 'org-1', status: 'active' },
  };

  const validMemberApiKey = {
    id: 'key-member-1',
    keyHash: 'fake-hash',
    projectId: '11111111-1111-1111-1111-111111111111',
    organizationId: 'org-1',
    scopes: ['delivery:read', 'delivery:replay'], // lacks delivery:manage
    revokedAt: null,
    expiresAt: null,
    organization: { id: 'org-1', name: 'Acme Org' },
    project: { organizationId: 'org-1', status: 'active' },
  };

  const sampleDeadLetter = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizationId: 'org-1',
    eventId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    deliveryId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    destinationId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    status: 'open',
    reason: 'server_error',
    errorMessage: 'HTTP 500 Internal Server Error',
    statusCode: 500,
    attemptCount: 5,
    replayedAt: null,
    resolvedAt: null,
    resolvedBy: null,
    dismissedAt: null,
    dismissedBy: null,
    dismissalReason: null,
    resolution: null,
    createdAt: new Date('2026-09-22T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$queryRaw.mockReset();
    mockPrisma.deadLetter.findFirst.mockReset();
    mockPrisma.deadLetter.findMany.mockReset();
    mockPrisma.apiKey.findUnique.mockResolvedValue(validManageApiKey);
    mockPrisma.apiKey.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    mockPrisma.auditLog.createMany.mockResolvedValue({ count: 1 });
  });

  // ─── 1. Authorization & Route Precedence ──────────────────────
  describe('Authorization & Route Precedence', () => {
    it('rejects with 403 Forbidden when caller lacks delivery:manage scope', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValueOnce(validMemberApiKey);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_memberkey');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('authorization_denied');
    });

    it('rejects resolve with 403 Forbidden when caller lacks delivery:manage scope', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValueOnce(validMemberApiKey);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_memberkey')
        .send({ resolution: 'Handled via external support ticket' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('authorization_denied');
    });

    it('routes static /dismiss-bulk before /:id/dismiss (does not interpret dismiss-bulk as :id)', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ ids: [sampleDeadLetter.id] });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        requested: 1,
        status: 'completed',
      });
    });

    it('routes static /resolve-bulk before /:id/resolve (does not interpret resolve-bulk as :id)', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/v1/dead-letters/resolve-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ ids: [sampleDeadLetter.id], resolution: 'Bulk manual resolution note' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        requested: 1,
        status: 'completed',
      });
    });
  });

  // ─── 2. Single Dismissal ──────────────────────────────────────
  describe('Single Dismissal: POST /v1/dead-letters/:id/dismiss', () => {
    it('1. Open → dismissed (returns 200 and updates status to dismissed)', async () => {
      const dismissedRecord = {
        ...sampleDeadLetter,
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: 'key-manage-1',
        dismissalReason: 'Endpoint retired',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([dismissedRecord]);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ reason: 'Endpoint retired' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('dismissed');
      expect(res.body.data.dismissalReason).toBe('Endpoint retired');
      expect(res.body.data.dismissedBy).toBe('key-manage-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'dead_letter.dismissed',
            resourceId: sampleDeadLetter.id,
            metadata: expect.objectContaining({
              previousStatus: 'open',
              newStatus: 'dismissed',
              dismissalReason: 'Endpoint retired',
            }),
          }),
        })
      );
    });

    it('2. Dismissed → dismissed returns 200 idempotent (does not duplicate audit log)', async () => {
      // 0 rows updated by atomic UPDATE
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      // findFirst returns already dismissed record
      const existingDismissed = {
        ...sampleDeadLetter,
        status: 'dismissed',
        dismissedAt: new Date('2026-09-22T11:00:00.000Z'),
        dismissedBy: 'key-manage-1',
        dismissalReason: 'Previously dismissed',
      };
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(existingDismissed);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ reason: 'Trying to dismiss again' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('dismissed');
      expect(res.body.data.dismissalReason).toBe('Previously dismissed');
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('3. Replaying → 409 Conflict', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'replaying',
      });

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey');

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('conflict');
      expect(res.body.message).toContain("status 'replaying'");
    });

    it('4. Resolved → 409 Conflict (opposite terminal state cannot be dismissed)', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'resolved',
      });

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey');

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('conflict');
      expect(res.body.message).toContain("status 'resolved'");
    });

    it('5. Unknown ID → 404 Not Found', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/v1/dead-letters/99999999-9999-9999-9999-999999999999/dismiss')
        .set('Authorization', 'Bearer zyvan_live_managekey');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('not_found');
    });

    it('6. Cross-tenant → 404 Not Found (scoped to organizationId)', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      // Not found in caller's organization
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('not_found');
    });

    it('7. Actor fields recorded in database and audit log', async () => {
      const dismissedRecord = {
        ...sampleDeadLetter,
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: 'key-manage-1',
        dismissalReason: 'Dismissed by operator',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([dismissedRecord]);

      await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({});

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              actorType: 'api_key',
              actorId: 'key-manage-1',
            }),
          }),
        })
      );
    });

    it('8. Original failure fields remain unchanged', async () => {
      const dismissedRecord = {
        ...sampleDeadLetter,
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: 'key-manage-1',
        dismissalReason: 'Custom reason',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([dismissedRecord]);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ reason: 'Custom reason' });

      expect(res.body.data.reason).toBe(sampleDeadLetter.reason);
      expect(res.body.data.statusCode).toBe(sampleDeadLetter.statusCode);
      expect(res.body.data.errorMessage).toBe(sampleDeadLetter.errorMessage);
      expect(res.body.data.attemptCount).toBe(sampleDeadLetter.attemptCount);
    });
  });

  // ─── 3. Single Manual Resolution ──────────────────────────────
  describe('Single Resolution: POST /v1/dead-letters/:id/resolve', () => {
    it('9. Open → resolved (returns 200 and updates status to resolved)', async () => {
      const resolvedRecord = {
        ...sampleDeadLetter,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'key-manage-1',
        resolution: 'Customer confirmed event was processed manually',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([resolvedRecord]);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Customer confirmed event was processed manually' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolution).toBe('Customer confirmed event was processed manually');
      expect(res.body.data.resolvedBy).toBe('key-manage-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'dead_letter.resolved',
            resourceId: sampleDeadLetter.id,
            metadata: expect.objectContaining({
              previousStatus: 'open',
              newStatus: 'resolved',
              resolution: 'Customer confirmed event was processed manually',
            }),
          }),
        })
      );
    });

    it('10. Resolved → resolved returns 200 idempotent (does not duplicate audit log)', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      const existingResolved = {
        ...sampleDeadLetter,
        status: 'resolved',
        resolvedAt: new Date('2026-09-22T11:00:00.000Z'),
        resolvedBy: 'key-manage-1',
        resolution: 'Already resolved externally',
      };
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(existingResolved);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Attempt second resolution' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolution).toBe('Already resolved externally');
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('11. Replaying → 409 Conflict', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'replaying',
      });

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Handled externally' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('conflict');
      expect(res.body.message).toContain("status 'replaying'");
    });

    it('12. Dismissed → 409 Conflict (opposite terminal state cannot be resolved)', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'dismissed',
      });

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Handled externally' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('conflict');
      expect(res.body.message).toContain("status 'dismissed'");
    });

    it('13. Resolution < 3 chars → 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'ok' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
    });

    it('14. Whitespace-only resolution → 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: '     ' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
    });

    it('15. Actor fields recorded in audit log', async () => {
      const resolvedRecord = {
        ...sampleDeadLetter,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'key-manage-1',
        resolution: 'Valid resolution note',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([resolvedRecord]);

      await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Valid resolution note' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              actorType: 'api_key',
              actorId: 'key-manage-1',
            }),
          }),
        })
      );
    });

    it('16. Original failure fields remain unchanged after resolution', async () => {
      const resolvedRecord = {
        ...sampleDeadLetter,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'key-manage-1',
        resolution: 'Valid resolution note',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([resolvedRecord]);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Valid resolution note' });

      expect(res.body.data.reason).toBe(sampleDeadLetter.reason);
      expect(res.body.data.statusCode).toBe(sampleDeadLetter.statusCode);
      expect(res.body.data.errorMessage).toBe(sampleDeadLetter.errorMessage);
      expect(res.body.data.attemptCount).toBe(sampleDeadLetter.attemptCount);
    });
  });

  // ─── 4. Bulk Operations ───────────────────────────────────────
  describe('Bulk Targeting & Operations', () => {
    const id1 = '11111111-1111-1111-1111-111111111111';
    const id2 = '22222222-2222-2222-2222-222222222222';

    it('17. Explicit ID list targets specific records', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: id1 }, { id: id2 }]);

      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ ids: [id1, id2] });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        requested: 2,
        affected: 2,
        dismissed: 2,
        skipped: 0,
        ids: [id1, id2],
        status: 'completed',
      });
    });

    it('18. Filter-based selection queries candidate dead letters', async () => {
      mockPrisma.deadLetter.findMany.mockResolvedValueOnce([
        { id: id1, status: 'open' },
        { id: id2, status: 'open' },
      ]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: id1 }, { id: id2 }]);

      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({
          filter: { destinationId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        requested: 2,
        affected: 2,
        dismissed: 2,
        skipped: 0,
        ids: [id1, id2],
      });
    });

    it('19. IDs + filter → 400 Bad Request (ids XOR filter required)', async () => {
      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({
          ids: [id1],
          filter: { destinationId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
      expect(res.body.message).toContain('Validation failed');
    });

    it('20. Neither IDs nor filter → 400 Bad Request (empty target rejected)', async () => {
      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
    });

    it('21. 100-item cap is enforced on IDs array', async () => {
      const over100Ids = Array.from({ length: 101 }, (_, i) =>
        `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
      );

      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ ids: over100Ids });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('invalid_request');
    });

    it('22. Duplicate IDs are automatically deduplicated before query', async () => {
      // Send 3 items with duplicates: id1, id1, id2
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: id1 }, { id: id2 }]);

      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ ids: [id1, id1, id2] });

      expect(res.status).toBe(200);
      expect(res.body.data.requested).toBe(2);
      expect(res.body.data.affected).toBe(2);
    });

    it('23. Cross-tenant IDs do not leak data and are counted as skipped', async () => {
      // 2 candidate IDs sent, but only id1 belongs to organization org-1
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: id1 }]);

      const res = await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ ids: [id1, id2] });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        requested: 2,
        affected: 1,
        dismissed: 1,
        skipped: 1,
        ids: [id1],
      });
    });

    it('24. Partial skip for non-open records during bulk resolve', async () => {
      // id1 is open, id2 is already replaying/resolved in DB
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: id1 }]);

      const res = await request(app)
        .post('/v1/dead-letters/resolve-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({
          ids: [id1, id2],
          resolution: 'Batch manual operational resolution',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        requested: 2,
        affected: 1,
        resolved: 1,
        skipped: 1,
        ids: [id1],
      });
    });

    it('25. Correct affected/skipped counts when all records are skipped', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/v1/dead-letters/resolve-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({
          ids: [id1, id2],
          resolution: 'Batch resolution note',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        requested: 2,
        affected: 0,
        resolved: 0,
        skipped: 2,
        ids: [],
      });
    });

    it('26. Bulk audit records created transactionally for affected records', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: id1 }, { id: id2 }]);

      await request(app)
        .post('/v1/dead-letters/dismiss-bulk')
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ ids: [id1, id2], reason: 'Decommissioned fleet' });

      expect(mockPrisma.auditLog.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            resourceId: id1,
            action: 'dead_letter.dismissed',
            metadata: expect.objectContaining({ mode: 'bulk', dismissalReason: 'Decommissioned fleet' }),
          }),
          expect.objectContaining({
            resourceId: id2,
            action: 'dead_letter.dismissed',
            metadata: expect.objectContaining({ mode: 'bulk', dismissalReason: 'Decommissioned fleet' }),
          }),
        ],
      });
    });
  });

  // ─── 5. Concurrency & Race Conditions ─────────────────────────
  describe('Concurrency & Race Conditions', () => {
    it('27. Concurrent dismiss requests → exactly one state transition wins', async () => {
      const dismissedRecord = {
        ...sampleDeadLetter,
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: 'key-1',
      };

      // Set up mocks before launching concurrent operations: Call 1 wins, Call 2 loses
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([dismissedRecord]) // Call 1
        .mockResolvedValueOnce([]);              // Call 2
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(dismissedRecord);

      const [res1, res2] = await Promise.all([
        dlqRepo.dismissDeadLetter({
          id: sampleDeadLetter.id,
          organizationId: 'org-1',
          reason: 'Call 1',
          dismissedBy: 'user-1',
        }),
        dlqRepo.dismissDeadLetter({
          id: sampleDeadLetter.id,
          organizationId: 'org-1',
          reason: 'Call 2',
          dismissedBy: 'user-2',
        }),
      ]);

      expect(res1.status).toBe('updated');
      expect(res2.status).toBe('already_terminal');
      expect(res2.record?.status).toBe('dismissed');
    });

    it('28. Concurrent resolve requests → exactly one state transition wins', async () => {
      const resolvedRecord = {
        ...sampleDeadLetter,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'key-1',
        resolution: 'Call 1 note',
      };

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([resolvedRecord]) // Call 1 wins
        .mockResolvedValueOnce([]);              // Call 2 loses
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(resolvedRecord);

      const [res1, res2] = await Promise.all([
        dlqRepo.resolveDeadLetter({
          id: sampleDeadLetter.id,
          organizationId: 'org-1',
          resolution: 'Call 1 note',
          resolvedBy: 'user-1',
        }),
        dlqRepo.resolveDeadLetter({
          id: sampleDeadLetter.id,
          organizationId: 'org-1',
          resolution: 'Call 2 note',
          resolvedBy: 'user-2',
        }),
      ]);

      expect(res1.status).toBe('updated');
      expect(res2.status).toBe('already_terminal');
      expect(res2.record?.status).toBe('resolved');
    });

    it('29. Replay vs Dismiss race: if replay claims first, dismiss gets 409', async () => {
      // Simulate replay having transitioned the DLQ to 'replaying'
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'replaying',
      });

      const res = await dlqRepo.dismissDeadLetter({
        id: sampleDeadLetter.id,
        organizationId: 'org-1',
        reason: 'Late dismiss',
        dismissedBy: 'user-1',
      });

      expect(res.status).toBe('conflict');
      expect(res.currentStatus).toBe('replaying');
    });

    it('30. Replay vs Resolve race: if replay claims first, resolve gets 409', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'replaying',
      });

      const res = await dlqRepo.resolveDeadLetter({
        id: sampleDeadLetter.id,
        organizationId: 'org-1',
        resolution: 'Late resolve',
        resolvedBy: 'user-1',
      });

      expect(res.status).toBe('conflict');
      expect(res.currentStatus).toBe('replaying');
    });

    it('31. Dismiss vs Resolve race: exactly one wins, other receives 409', async () => {
      // Dismiss won first, setting status to 'dismissed'
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: 'user-1',
      });

      const res = await dlqRepo.resolveDeadLetter({
        id: sampleDeadLetter.id,
        organizationId: 'org-1',
        resolution: 'Resolve racing with dismiss',
        resolvedBy: 'user-2',
      });

      expect(res.status).toBe('conflict');
      expect(res.currentStatus).toBe('dismissed');
    });
  });

  // ─── 6. Integrity Invariants ──────────────────────────────────
  describe('Integrity & Non-Mutation Invariants', () => {
    it('32. Delivery remains failed (manual resolve never marks Delivery as delivered)', async () => {
      const resolvedRecord = {
        ...sampleDeadLetter,
        status: 'resolved',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([resolvedRecord]);

      await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Business resolution outside Zyvan' });

      // Delivery model should NEVER be touched during manual resolution
      expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
    });

    it('33. Event remains unchanged (no mutation of Event.status)', async () => {
      const dismissedRecord = {
        ...sampleDeadLetter,
        status: 'dismissed',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([dismissedRecord]);

      await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ reason: 'Operator dismissed' });

      // Event model should NEVER be touched
      expect(mockPrisma.event.update).not.toHaveBeenCalled();
    });

    it('34. Original DLQ failure details remain immutable', async () => {
      const resolvedRecord = {
        ...sampleDeadLetter,
        status: 'resolved',
        resolution: 'Customer sync',
      };
      mockPrisma.$queryRaw.mockResolvedValueOnce([resolvedRecord]);

      const res = await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/resolve`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ resolution: 'Customer sync' });

      expect(res.body.data.reason).toBe('server_error');
      expect(res.body.data.statusCode).toBe(500);
      expect(res.body.data.errorMessage).toBe('HTTP 500 Internal Server Error');
      expect(res.body.data.attemptCount).toBe(5);
    });

    it('35. No duplicate audit records for idempotent retries', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        ...sampleDeadLetter,
        status: 'dismissed',
      });

      await request(app)
        .post(`/v1/dead-letters/${sampleDeadLetter.id}/dismiss`)
        .set('Authorization', 'Bearer zyvan_live_managekey')
        .send({ reason: 'Retry dismiss' });

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });
});
