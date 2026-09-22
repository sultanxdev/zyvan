import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZyvanClient } from '../../src/client';
import { EventsResource } from '../../src/resources/events';
import { ValidationError, NotFoundError } from '../../src/errors';

describe('PR 4.2: EventsResource', () => {
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
    expect(client.events).toBeInstanceOf(EventsResource);
  });

  describe('send()', () => {
    it('generates an idempotency key automatically when none is provided', async () => {
      const mockResponse = {
        event_id: 'evt_generated_key',
        status: 'queued',
        created_at: '2026-09-23T00:00:00.000Z',
        duplicate: false,
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await client.events.send({
        type: 'invoice.paid',
        payload: { amount: 5000, currency: 'USD' },
      });

      expect(res).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.zyvan.dev/v1/events');
      expect(init.method).toBe('POST');

      const headers = init.headers as Headers;
      const idempHeader = headers.get('Idempotency-Key');
      expect(idempHeader).toBeTruthy();
      expect(idempHeader?.length).toBeGreaterThan(10);

      const parsedBody = JSON.parse(init.body as string);
      expect(parsedBody.type).toBe('invoice.paid');
      expect(parsedBody.data).toEqual({ amount: 5000, currency: 'USD' });
      expect(parsedBody.idempotency_key).toBe(idempHeader);
    });

    it('uses explicit idempotencyKey from options', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            event_id: 'evt_explicit_opt',
            status: 'queued',
            created_at: '2026-09-23T00:00:00.000Z',
            duplicate: false,
          }),
          { status: 202 }
        )
      );

      await client.events.send(
        {
          type: 'order.created',
          payload: { orderId: 'ord_1' },
        },
        { idempotencyKey: 'custom_idemp_key_999' }
      );

      const init = mockFetch.mock.calls[0][1];
      const headers = init.headers as Headers;
      expect(headers.get('Idempotency-Key')).toBe('custom_idemp_key_999');

      const parsedBody = JSON.parse(init.body as string);
      expect(parsedBody.idempotency_key).toBe('custom_idemp_key_999');
    });

    it('uses explicit idempotencyKey from input when options omitted', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            event_id: 'evt_explicit_input',
            status: 'queued',
            created_at: '2026-09-23T00:00:00.000Z',
            duplicate: false,
          }),
          { status: 202 }
        )
      );

      await client.events.send({
        type: 'user.signup',
        payload: { userId: 'u_123' },
        idempotencyKey: 'input_idemp_key_456',
      });

      const init = mockFetch.mock.calls[0][1];
      const headers = init.headers as Headers;
      expect(headers.get('Idempotency-Key')).toBe('input_idemp_key_456');

      const parsedBody = JSON.parse(init.body as string);
      expect(parsedBody.idempotency_key).toBe('input_idemp_key_456');
    });

    it('passes custom event headers and projectId if supplied', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            event_id: 'evt_custom_fields',
            status: 'queued',
            created_at: '2026-09-23T00:00:00.000Z',
            duplicate: false,
          }),
          { status: 202 }
        )
      );

      await client.events.send({
        type: 'webhook.received',
        payload: { test: true },
        headers: { 'X-Source': 'stripe' },
        projectId: 'proj_override_1',
      });

      const init = mockFetch.mock.calls[0][1];
      const headers = init.headers as Headers;
      expect(headers.get('X-Project-Id')).toBe('proj_override_1');

      const parsedBody = JSON.parse(init.body as string);
      expect(parsedBody.headers).toEqual({ 'X-Source': 'stripe' });
      expect(parsedBody.projectId).toBe('proj_override_1');
    });

    it('throws client-side Error when type is missing or empty', async () => {
      await expect(client.events.send({ type: '', payload: {} })).rejects.toThrow(
        'Event type is required'
      );
      await expect(client.events.send({ type: '   ', payload: {} })).rejects.toThrow(
        'Event type is required'
      );
    });

    it('propagates ValidationError on 400 Bad Request response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'validation_error',
            message: 'Invalid payload structure',
            details: { field: 'type' },
          }),
          { status: 400 }
        )
      );

      await expect(
        client.events.send({ type: 'invalid.evt', payload: {} })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('list()', () => {
    it('serializes all query filters into query string and returns paginated response', async () => {
      const mockResult = {
        data: [
          {
            id: 'evt_1',
            eventType: 'order.completed',
            status: 'delivered',
            createdAt: '2026-09-23T00:00:00.000Z',
            deliveryCount: 2,
          },
        ],
        pagination: {
          nextCursor: 'cursor_abc123',
          hasMore: true,
        },
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const res = await client.events.list({
        eventType: 'order.completed',
        status: 'delivered',
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-23T00:00:00.000Z',
        search: 'ord_1',
        cursor: 'prev_cursor_xyz',
        limit: 25,
      });

      expect(res).toEqual(mockResult);

      const requestedUrl = mockFetch.mock.calls[0][0];
      const urlObj = new URL(requestedUrl);
      expect(urlObj.pathname).toBe('/v1/events');
      expect(urlObj.searchParams.get('eventType')).toBe('order.completed');
      expect(urlObj.searchParams.get('status')).toBe('delivered');
      expect(urlObj.searchParams.get('from')).toBe('2026-09-01T00:00:00.000Z');
      expect(urlObj.searchParams.get('to')).toBe('2026-09-23T00:00:00.000Z');
      expect(urlObj.searchParams.get('search')).toBe('ord_1');
      expect(urlObj.searchParams.get('cursor')).toBe('prev_cursor_xyz');
      expect(urlObj.searchParams.get('limit')).toBe('25');
    });

    it('works with empty filters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            pagination: { nextCursor: null, hasMore: false },
          }),
          { status: 200 }
        )
      );

      const res = await client.events.list();
      expect(res.data).toEqual([]);
      expect(res.pagination.hasMore).toBe(false);
    });
  });

  describe('get(id)', () => {
    it('fetches event detail and unwraps data payload', async () => {
      const mockEventDetail = {
        id: 'evt_100',
        organizationId: 'org_1',
        projectId: 'proj_1',
        eventType: 'payment.succeeded',
        idempotencyKey: 'idemp_key_100',
        payload: { amount: 100 },
        status: 'delivered',
        createdAt: '2026-09-23T00:00:00.000Z',
        deliveries: [
          {
            id: 'del_1',
            destinationId: 'dest_1',
            status: 'success',
            attemptCount: 1,
            attempts: [],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockEventDetail }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const event = await client.events.get('evt_100');

      expect(event).toEqual(mockEventDetail);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/events/evt_100',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws client-side Error when ID is empty', async () => {
      await expect(client.events.get('')).rejects.toThrow('Event ID is required');
    });

    it('propagates NotFoundError on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 'not_found', message: 'Event not found' }),
          { status: 404 }
        )
      );

      await expect(client.events.get('missing_evt')).rejects.toThrow(NotFoundError);
    });
  });
});
