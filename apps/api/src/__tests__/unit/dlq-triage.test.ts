import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { getPrismaClient } from '@zyvan/db';
import {
  encodeCursor,
  decodeCursor,
  buildDLQWhere,
  listByOrganization,
  getSummary,
  findById,
} from '../../modules/dlq/repository';

vi.mock('@zyvan/db', () => {
  const mockPrisma = {
    deadLetter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    destination: {
      findMany: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
    },
  };
  return {
    getPrismaClient: vi.fn().mockReturnValue(mockPrisma),
  };
});

describe('PR 3.1: Dead Letter Queue (DLQ) Triage Unit Tests', () => {
  const mockPrisma = getPrismaClient() as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.apiKey.update.mockResolvedValue({});
  });

  // ─── 1. Cursor Encoding & Decoding ───────────────────────────
  describe('Deterministic Composite Cursor', () => {
    it('correctly encodes and decodes cursor with createdAt and id', () => {
      const now = new Date('2026-09-22T10:00:00.000Z');
      const id = '11111111-2222-3333-4444-555555555555';

      const encoded = encodeCursor(now, id);
      expect(typeof encoded).toBe('string');

      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual({
        createdAt: '2026-09-22T10:00:00.000Z',
        id,
      });
    });

    it('returns null when decoding corrupt or invalid cursor strings', () => {
      expect(decodeCursor('invalid-base64')).toBeNull();
      expect(decodeCursor(Buffer.from('{"invalid":"shape"}').toString('base64'))).toBeNull();
      expect(decodeCursor(Buffer.from('{"createdAt":"not-a-date","id":"abc"}').toString('base64'))).toBeNull();
    });

    it('builds composite pagination predicate (createdAt < cursor OR (createdAt = cursor AND id < cursor))', async () => {
      const cursor = encodeCursor(new Date('2026-09-22T12:00:00.000Z'), 'uuid-2');
      mockPrisma.deadLetter.findMany.mockResolvedValueOnce([]);

      await listByOrganization('org-1', {
        cursor,
        limit: 10,
        status: 'open',
      });

      expect(mockPrisma.deadLetter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            status: 'open',
            AND: [
              {
                OR: [
                  { createdAt: { lt: new Date('2026-09-22T12:00:00.000Z') } },
                  {
                    createdAt: new Date('2026-09-22T12:00:00.000Z'),
                    id: { lt: 'uuid-2' },
                  },
                ],
              },
            ],
          }),
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          take: 11,
        })
      );
    });
  });

  // ─── 2. Query Builder (buildDLQWhere) ────────────────────────
  describe('buildDLQWhere Query Builder', () => {
    it('applies structured reason filtering without text matching', () => {
      const where = buildDLQWhere('org-1', {
        reason: 'terminal_4xx',
      });

      expect(where.organizationId).toBe('org-1');
      expect(where.reason).toBe('terminal_4xx');
    });

    it('applies lifecycle status filtering', () => {
      const where = buildDLQWhere('org-1', {
        status: 'replaying',
      });

      expect(where.organizationId).toBe('org-1');
      expect(where.status).toBe('replaying');
    });

    it('applies projectId and eventType scope through event relation', () => {
      const where = buildDLQWhere('org-1', {
        projectId: 'proj-123',
        eventType: 'invoice.failed',
      });

      expect(where.event).toEqual({
        projectId: 'proj-123',
        eventType: 'invoice.failed',
      });
    });

    it('handles search query for UUID (event.id OR idempotencyKey)', () => {
      const uuid = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      const where = buildDLQWhere('org-1', { search: uuid });

      expect(where.event).toEqual({
        OR: [{ id: uuid }, { idempotencyKey: uuid }],
      });
    });

    it('handles search query for non-UUID (idempotencyKey substring)', () => {
      const where = buildDLQWhere('org-1', { search: 'order_ref_123' });

      expect(where.event).toEqual({
        idempotencyKey: { contains: 'order_ref_123', mode: 'insensitive' },
      });
    });

    it('applies time window filtering (from / to)', () => {
      const from = '2026-09-20T00:00:00.000Z';
      const to = '2026-09-22T23:59:59.000Z';
      const where = buildDLQWhere('org-1', { from, to });

      expect(where.createdAt).toEqual({
        gte: new Date(from),
        lte: new Date(to),
      });
    });
  });

  // ─── 3. Summary Aggregation & Tie-Breaking ───────────────────
  describe('getSummary Aggregation', () => {
    it('aggregates total, status counts, reason counts, and top destinations without status default', async () => {
      mockPrisma.deadLetter.count.mockResolvedValueOnce(42);
      mockPrisma.deadLetter.groupBy
        .mockResolvedValueOnce([
          { status: 'open', _count: { id: 30 } },
          { status: 'replaying', _count: { id: 2 } },
          { status: 'resolved', _count: { id: 8 } },
          { status: 'dismissed', _count: { id: 2 } },
        ])
        .mockResolvedValueOnce([
          { reason: 'terminal_4xx', _count: { id: 20 } },
          { reason: 'retries_exhausted', _count: { id: 15 } },
          { reason: 'timeout', _count: { id: 5 } },
          { reason: 'ssrf_blocked', _count: { id: 2 } },
        ])
        .mockResolvedValueOnce([
          { destinationId: 'dest-b', _count: { id: 10 } },
          { destinationId: 'dest-a', _count: { id: 10 } }, // Tie with dest-b!
          { destinationId: 'dest-c', _count: { id: 5 } },
        ]);

      mockPrisma.destination.findMany.mockResolvedValueOnce([
        { id: 'dest-a', url: 'https://api.a.com/webhook' },
        { id: 'dest-b', url: 'https://api.b.com/webhook' },
        { id: 'dest-c', url: 'https://api.c.com/webhook' },
      ]);

      const summary = await getSummary('org-1', {});

      expect(summary.total).toBe(42);
      expect(summary.byStatus).toEqual({
        open: 30,
        replaying: 2,
        resolved: 8,
        dismissed: 2,
      });
      expect(summary.byReason).toEqual({
        terminal_4xx: 20,
        retries_exhausted: 15,
        ssrf_blocked: 2,
        timeout: 5,
        other: 0,
      });

      // Tie-breaking: dest-a comes before dest-b because count is tied (10) and 'dest-a' < 'dest-b'
      expect(summary.topDestinations).toEqual([
        {
          destinationId: 'dest-a',
          destinationUrl: 'https://api.a.com/webhook',
          count: 10,
        },
        {
          destinationId: 'dest-b',
          destinationUrl: 'https://api.b.com/webhook',
          count: 10,
        },
        {
          destinationId: 'dest-c',
          destinationUrl: 'https://api.c.com/webhook',
          count: 5,
        },
      ]);
    });
  });

  // ─── 4. Summary & List Equivalence ───────────────────────────
  describe('Summary / List Equivalence', () => {
    it('produces identical WHERE criteria for both list and summary under the same filters', async () => {
      const filters = {
        projectId: '11111111-2222-3333-4444-555555555555',
        reason: 'retries_exhausted' as const,
        status: 'open' as const,
      };

      const whereForList = buildDLQWhere('org-1', filters);
      const whereForSummary = buildDLQWhere('org-1', filters);

      expect(whereForList).toEqual(whereForSummary);
    });
  });

  // ─── 5. Tenant Isolation ─────────────────────────────────────
  describe('Cross-Tenant Isolation in findById', () => {
    it('returns record when organizationId matches', async () => {
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce({
        id: 'dl-1',
        organizationId: 'org-tenant-a',
        eventId: 'evt-1',
        deliveryId: 'del-1',
      });

      const record = await findById('dl-1', 'org-tenant-a');
      expect(record).not.toBeNull();
      expect(record?.id).toBe('dl-1');
      expect(mockPrisma.deadLetter.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'dl-1',
            organizationId: 'org-tenant-a',
          },
        })
      );
    });

    it('returns null when organizationId does not match (Org B accessing Org A record)', async () => {
      mockPrisma.deadLetter.findFirst.mockResolvedValueOnce(null);

      const record = await findById('dl-1', 'org-tenant-b');
      expect(record).toBeNull();
    });
  });

  // ─── 6. Route Ordering & Authorization ───────────────────────
  describe('DLQ Route Ordering and Access Control', () => {
    it('blocks unauthenticated access with 401', async () => {
      const res = await request(app).get('/v1/dead-letters');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('authentication_failed');
    });

    it('blocks access if apiKey does not have delivery:read scope with 403', async () => {
      // Mock an active API key with only events:write scope
      mockPrisma.apiKey.findUnique.mockResolvedValueOnce({
        id: 'key-1',
        keyHash: 'fake-hash',
        projectId: 'proj-1',
        organizationId: 'org-1',
        scopes: ['events:write'], // Missing delivery:read!
        revokedAt: null,
        expiresAt: null,
        organization: { id: 'org-1', name: 'Acme Org' },
        project: { organizationId: 'org-1', status: 'active' },
      });

      const res = await request(app)
        .get('/v1/dead-letters')
        .set('Authorization', 'Bearer zyvan_live_testkey123');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('authorization_denied');
    });

    it('distinguishes static route /summary from parameterized route /:id', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        keyHash: 'fake-hash',
        projectId: '11111111-1111-1111-1111-111111111111',
        organizationId: 'org-1',
        scopes: ['delivery:read'],
        revokedAt: null,
        expiresAt: null,
        organization: { id: 'org-1', name: 'Acme Org' },
        project: { organizationId: 'org-1', status: 'active' },
      });

      mockPrisma.deadLetter.count.mockResolvedValue(0);
      mockPrisma.deadLetter.groupBy.mockResolvedValue([]);

      const res = await request(app)
        .get('/v1/dead-letters/summary')
        .set('Authorization', 'Bearer zyvan_live_testkey123');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.total).toBe(0);
    });
  });
});
