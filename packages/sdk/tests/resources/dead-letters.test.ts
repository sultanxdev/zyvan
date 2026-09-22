import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZyvanClient } from '../../src/client';
import { DeadLettersResource } from '../../src/resources/dead-letters';
import { NotFoundError, ConflictError, ValidationError } from '../../src/errors';

describe('PR 4.2: DeadLettersResource', () => {
  const apiKey = 'zyvan_test_api_key_123';
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: ZyvanClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });
  });

  it('is exposed as a property on ZyvanClient', () => {
    expect(client.deadLetters).toBeInstanceOf(DeadLettersResource);
  });

  describe('list()', () => {
    it('serializes all filters and returns paginated dead letters', async () => {
      const mockResult = {
        data: [
          {
            id: 'dlq_1',
            organizationId: 'org_1',
            eventId: 'evt_1',
            deliveryId: 'del_1',
            destinationId: 'dest_1',
            status: 'open',
            reason: 'max_retries_exceeded',
            attemptCount: 5,
            createdAt: '2026-09-23T00:00:00.000Z',
          },
        ],
        pagination: { nextCursor: null, hasMore: false },
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), { status: 200 })
      );

      const res = await client.deadLetters.list({
        status: 'open',
        destinationId: 'dest_1',
        reason: 'max_retries_exceeded',
        limit: 50,
      });

      expect(res).toEqual(mockResult);

      const requestedUrl = mockFetch.mock.calls[0][0];
      const urlObj = new URL(requestedUrl);
      expect(urlObj.pathname).toBe('/v1/dead-letters');
      expect(urlObj.searchParams.get('status')).toBe('open');
      expect(urlObj.searchParams.get('destinationId')).toBe('dest_1');
      expect(urlObj.searchParams.get('reason')).toBe('max_retries_exceeded');
      expect(urlObj.searchParams.get('limit')).toBe('50');
    });
  });

  describe('getSummary()', () => {
    it('fetches aggregated triage summary metrics and unwraps data', async () => {
      const mockSummary = {
        total: 42,
        byStatus: { open: 40, replaying: 1, resolved: 1, dismissed: 0 },
        byReason: { max_retries_exceeded: 30, timeout: 12 },
        topDestinations: [{ destinationId: 'dest_1', count: 25 }],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockSummary }), { status: 200 })
      );

      const summary = await client.deadLetters.getSummary({ status: 'open' });
      expect(summary).toEqual(mockSummary);

      const requestedUrl = mockFetch.mock.calls[0][0];
      expect(requestedUrl).toBe('https://api.zyvan.dev/v1/dead-letters/summary?status=open');
    });
  });

  describe('get(id)', () => {
    it('fetches full dead letter detail with attempts and unwraps data', async () => {
      const mockDetail = {
        id: 'dlq_100',
        organizationId: 'org_1',
        eventId: 'evt_1',
        deliveryId: 'del_1',
        destinationId: 'dest_1',
        status: 'open',
        reason: 'http_500',
        attemptCount: 3,
        createdAt: '2026-09-23T00:00:00.000Z',
        event: {
          id: 'evt_1',
          eventType: 'order.created',
          status: 'failed',
          createdAt: '2026-09-23T00:00:00.000Z',
        },
        delivery: {
          id: 'del_1',
          status: 'dead_letter',
          attemptCount: 3,
          attempts: [],
        },
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockDetail }), { status: 200 })
      );

      const detail = await client.deadLetters.get('dlq_100');
      expect(detail).toEqual(mockDetail);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/dead-letters/dlq_100',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws client-side Error when ID is empty', async () => {
      await expect(client.deadLetters.get('')).rejects.toThrow('Dead letter ID is required');
    });

    it('propagates NotFoundError on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'not_found', message: 'Dead letter not found' }),
          { status: 404 }
        )
      );

      await expect(client.deadLetters.get('missing_dlq')).rejects.toThrow(NotFoundError);
    });
  });

  describe('replay(id, options)', () => {
    it('replays a dead letter with required Idempotency-Key and unwraps response', async () => {
      const mockReplayRes = {
        status: 'created',
        replayId: 'rep_1',
        deliveryId: 'del_new_1',
        deadLetterId: 'dlq_1',
        replayStatus: 'pending',
        createdAt: '2026-09-23T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockReplayRes }), { status: 202 })
      );

      const res = await client.deadLetters.replay('dlq_1', {
        idempotencyKey: 'replay_idemp_key_1',
      });

      expect(res).toEqual(mockReplayRes);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/dead-letters/dlq_1/replay',
        expect.objectContaining({ method: 'POST' })
      );

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Idempotency-Key')).toBe('replay_idemp_key_1');
    });

    it('throws client-side Error when idempotencyKey option is missing or whitespace', async () => {
      await expect(
        client.deadLetters.replay('dlq_1', { idempotencyKey: '' })
      ).rejects.toThrow("Replay requires a non-empty 'idempotencyKey' option");

      await expect(
        client.deadLetters.replay('dlq_1', { idempotencyKey: '   ' })
      ).rejects.toThrow("Replay requires a non-empty 'idempotencyKey' option");
    });

    it('propagates ConflictError on 409 (e.g. non-open DLQ)', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'conflict',
            message: 'Dead letter is not in OPEN status',
          }),
          { status: 409 }
        )
      );

      await expect(
        client.deadLetters.replay('dlq_1', { idempotencyKey: 'idemp_key_1' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('replayBulk(input, options)', () => {
    it('sends bulk replay with mandatory Idempotency-Key header and unwraps response', async () => {
      const mockBulkRes = {
        status: 'created',
        batchId: 'batch_123',
        requested: 10,
        accepted: 8,
        skipped: 2,
        batchStatus: 'processing',
        replays: [],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockBulkRes }), { status: 202 })
      );

      const res = await client.deadLetters.replayBulk(
        {
          filter: { reason: 'http_503' },
          limit: 10,
        },
        { idempotencyKey: 'bulk_idemp_key_1' }
      );

      expect(res).toEqual(mockBulkRes);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/dead-letters/replay-bulk',
        expect.objectContaining({ method: 'POST' })
      );

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Idempotency-Key')).toBe('bulk_idemp_key_1');

      const parsedBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(parsedBody.filter.reason).toBe('http_503');
      expect(parsedBody.limit).toBe(10);
    });

    it('throws client-side Error when bulk idempotencyKey is missing', async () => {
      await expect(
        client.deadLetters.replayBulk({}, { idempotencyKey: '' })
      ).rejects.toThrow("Replay bulk requires a non-empty 'idempotencyKey' option");
    });
  });

  describe('dismiss(id, input)', () => {
    it('dismisses a dead letter and unwraps result', async () => {
      const mockDismissed = {
        id: 'dlq_1',
        status: 'dismissed',
        dismissalReason: 'Not relevant anymore',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockDismissed }), { status: 200 })
      );

      const res = await client.deadLetters.dismiss('dlq_1', {
        reason: 'Not relevant anymore',
      });

      expect(res).toEqual(mockDismissed);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/dead-letters/dlq_1/dismiss',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('dismissBulk(input)', () => {
    it('bulk dismisses dead letters and unwraps BulkMutationResponse', async () => {
      const mockBulkMutation = {
        requested: 5,
        affected: 5,
        dismissed: 5,
        skipped: 0,
        ids: ['dlq_1', 'dlq_2'],
        status: 'completed',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockBulkMutation }), { status: 200 })
      );

      const res = await client.deadLetters.dismissBulk({
        ids: ['dlq_1', 'dlq_2'],
        reason: 'Cleaned up staging errors',
      });

      expect(res).toEqual(mockBulkMutation);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/dead-letters/dismiss-bulk',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('resolve(id, input)', () => {
    it('manually resolves a dead letter with resolution note and unwraps result', async () => {
      const mockResolved = {
        id: 'dlq_1',
        status: 'resolved',
        resolution: 'Customer updated webhook endpoint manually',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockResolved }), { status: 200 })
      );

      const res = await client.deadLetters.resolve('dlq_1', {
        resolution: 'Customer updated webhook endpoint manually',
      });

      expect(res).toEqual(mockResolved);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/dead-letters/dlq_1/resolve',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws client-side Error when resolution note is empty', async () => {
      await expect(
        client.deadLetters.resolve('dlq_1', { resolution: '' })
      ).rejects.toThrow('Resolution note is required');

      await expect(
        client.deadLetters.resolve('dlq_1', { resolution: '   ' })
      ).rejects.toThrow('Resolution note is required');
    });
  });

  describe('resolveBulk(input)', () => {
    it('bulk resolves dead letters with resolution note and unwraps BulkMutationResponse', async () => {
      const mockBulkMutation = {
        requested: 3,
        affected: 3,
        resolved: 3,
        skipped: 0,
        ids: ['dlq_1'],
        status: 'completed',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockBulkMutation }), { status: 200 })
      );

      const res = await client.deadLetters.resolveBulk({
        ids: ['dlq_1'],
        resolution: 'Handled via manual DB update',
      });

      expect(res).toEqual(mockBulkMutation);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/dead-letters/resolve-bulk',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws client-side Error when bulk resolution note is empty', async () => {
      await expect(
        client.deadLetters.resolveBulk({ resolution: '' })
      ).rejects.toThrow('Resolution note is required');
    });
  });
});
