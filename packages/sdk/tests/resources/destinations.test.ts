import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZyvanClient } from '../../src/client';
import { DestinationsResource } from '../../src/resources/destinations';
import { NotFoundError, ValidationError } from '../../src/errors';

describe('PR 4.2: DestinationsResource', () => {
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
    expect(client.destinations).toBeInstanceOf(DestinationsResource);
  });

  describe('create()', () => {
    it('creates destination and unwraps data payload', async () => {
      const mockCreated = {
        id: 'dest_123',
        organizationId: 'org_1',
        projectId: 'proj_1',
        url: 'https://example.com/webhooks',
        active: true,
        createdAt: '2026-09-23T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockCreated }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const dest = await client.destinations.create({
        url: 'https://example.com/webhooks',
        secret: 'whsec_custom_123',
        retryPolicy: { maxRetries: 5 },
      });

      expect(dest).toEqual(mockCreated);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/destinations',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws client-side Error when URL is empty', async () => {
      await expect(client.destinations.create({ url: '' })).rejects.toThrow(
        'Destination URL is required'
      );
    });
  });

  describe('list()', () => {
    it('lists destinations and unwraps array', async () => {
      const mockDestinations = [
        {
          id: 'dest_1',
          organizationId: 'org_1',
          projectId: 'proj_1',
          url: 'https://api.one.com',
          active: true,
          createdAt: '2026-09-23T00:00:00.000Z',
        },
      ];

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockDestinations }), { status: 200 })
      );

      const res = await client.destinations.list({ projectId: 'proj_1' });
      expect(res).toEqual(mockDestinations);

      const requestedUrl = mockFetch.mock.calls[0][0];
      expect(requestedUrl).toBe('https://api.zyvan.dev/v1/destinations?projectId=proj_1');
    });
  });

  describe('get(id)', () => {
    it('fetches single destination by ID', async () => {
      const mockDest = {
        id: 'dest_999',
        organizationId: 'org_1',
        projectId: 'proj_1',
        url: 'https://api.target.com',
        active: true,
        createdAt: '2026-09-23T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockDest }), { status: 200 })
      );

      const dest = await client.destinations.get('dest_999');
      expect(dest).toEqual(mockDest);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/destinations/dest_999',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws on empty ID', async () => {
      await expect(client.destinations.get('')).rejects.toThrow('Destination ID is required');
    });
  });

  describe('update(id, input)', () => {
    it('updates destination via PATCH and unwraps result', async () => {
      const mockUpdated = {
        id: 'dest_999',
        organizationId: 'org_1',
        projectId: 'proj_1',
        url: 'https://newurl.com/wh',
        active: false,
        createdAt: '2026-09-23T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUpdated }), { status: 200 })
      );

      const dest = await client.destinations.update('dest_999', {
        url: 'https://newurl.com/wh',
        active: false,
      });

      expect(dest).toEqual(mockUpdated);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/destinations/dest_999',
        expect.objectContaining({ method: 'PATCH' })
      );
      const parsedBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(parsedBody.url).toBe('https://newurl.com/wh');
      expect(parsedBody.active).toBe(false);
    });
  });

  describe('delete(id)', () => {
    it('sends DELETE request and returns void', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Destination deleted successfully' }), {
          status: 200,
        })
      );

      await client.destinations.delete('dest_to_delete');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/destinations/dest_to_delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('propagates NotFoundError on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'not_found', message: 'Destination not found' }),
          { status: 404 }
        )
      );

      await expect(client.destinations.delete('dest_nonexistent')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('pause(id) and resume(id)', () => {
    it('pause sends POST /pause and unwraps data', async () => {
      const mockPaused = {
        id: 'dest_p',
        active: false,
      };

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: mockPaused, message: 'Destination paused' }),
          { status: 200 }
        )
      );

      const dest = await client.destinations.pause('dest_p');
      expect(dest).toEqual(mockPaused);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/destinations/dest_p/pause',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('resume sends POST /resume and unwraps data', async () => {
      const mockResumed = {
        id: 'dest_p',
        active: true,
      };

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: mockResumed, message: 'Destination resumed' }),
          { status: 200 }
        )
      );

      const dest = await client.destinations.resume('dest_p');
      expect(dest).toEqual(mockResumed);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/destinations/dest_p/resume',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('test(id)', () => {
    it('sends test ping request and unwraps data', async () => {
      const mockTestRes = {
        success: true,
        message: 'Test ping dispatched to destination URL',
        destinationUrl: 'https://example.com',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockTestRes }), { status: 200 })
      );

      const res = await client.destinations.test('dest_test_1');
      expect(res).toEqual(mockTestRes);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/destinations/dest_test_1/test',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
