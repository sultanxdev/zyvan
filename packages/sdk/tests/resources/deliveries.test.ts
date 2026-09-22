import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZyvanClient } from '../../src/client';
import { DeliveriesResource } from '../../src/resources/deliveries';
import { NotFoundError } from '../../src/errors';

describe('PR 4.2: DeliveriesResource', () => {
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
    expect(client.deliveries).toBeInstanceOf(DeliveriesResource);
  });

  describe('list(destinationId, params)', () => {
    it('lists deliveries for a destination with cursor pagination', async () => {
      const mockResult = {
        data: [
          {
            id: 'del_1',
            organizationId: 'org_1',
            destinationId: 'dest_1',
            eventId: 'evt_1',
            status: 'success',
            attemptCount: 1,
            lastStatusCode: 200,
            lastDeliveredAt: '2026-09-23T00:00:00.000Z',
            createdAt: '2026-09-23T00:00:00.000Z',
          },
        ],
        pagination: {
          nextCursor: 'del_cursor_next',
          hasMore: true,
        },
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), { status: 200 })
      );

      const res = await client.deliveries.list('dest_1', {
        cursor: 'del_cursor_prev',
        limit: 10,
      });

      expect(res).toEqual(mockResult);

      const requestedUrl = mockFetch.mock.calls[0][0];
      const urlObj = new URL(requestedUrl);
      expect(urlObj.pathname).toBe('/v1/destinations/dest_1/deliveries');
      expect(urlObj.searchParams.get('cursor')).toBe('del_cursor_prev');
      expect(urlObj.searchParams.get('limit')).toBe('10');
    });

    it('throws client-side Error when destinationId is empty', async () => {
      await expect(client.deliveries.list('')).rejects.toThrow(
        'Destination ID is required'
      );
      await expect(client.deliveries.list('   ')).rejects.toThrow(
        'Destination ID is required'
      );
    });

    it('propagates NotFoundError on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'not_found', message: 'Destination not found' }),
          { status: 404 }
        )
      );

      await expect(client.deliveries.list('dest_missing')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
