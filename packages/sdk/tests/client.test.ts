import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZyvanClient } from '../src/client';
import crypto from 'crypto';

describe('PR 4.1: ZyvanClient', () => {
  const apiKey = 'zyvan_test_mock_key_client';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
  });

  describe('Instantiation & Validation', () => {
    it('throws error when apiKey is missing or whitespace', () => {
      expect(() => new ZyvanClient({ apiKey: '' })).toThrow('requires a non-empty apiKey');
      expect(() => new ZyvanClient({ apiKey: '   ' })).toThrow('requires a non-empty apiKey');
      expect(() => new ZyvanClient(undefined as any)).toThrow('requires a non-empty apiKey');
    });

    it('instantiates successfully with valid apiKey', () => {
      const client = new ZyvanClient({ apiKey });
      expect(client).toBeInstanceOf(ZyvanClient);
    });
  });

  describe('HTTP Convenience Methods', () => {
    it('executes GET request through transport', async () => {
      const client = new ZyvanClient({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'evt_1' }), { status: 200 })
      );

      const res = await client.get<{ id: string }>('/v1/events/evt_1', {
        query: { expand: 'attempts' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.data).toEqual({ id: 'evt_1' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/events/evt_1?expand=attempts',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('executes POST request through transport', async () => {
      const client = new ZyvanClient({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'evt_new' }), { status: 201 })
      );

      const res = await client.post<{ id: string }>(
        '/v1/events',
        { eventType: 'user.created' },
        { idempotencyKey: 'idemp_post_1' }
      );

      expect(res.statusCode).toBe(201);
      expect(res.data).toEqual({ id: 'evt_new' });
      const init = mockFetch.mock.calls[0][1];
      expect(init.method).toBe('POST');
      expect((init.headers as Headers).get('Idempotency-Key')).toBe('idemp_post_1');
    });

    it('executes PUT request through transport', async () => {
      const client = new ZyvanClient({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ updated: true }), { status: 200 })
      );

      const res = await client.put<{ updated: boolean }>(
        '/v1/destinations/dest_1',
        { active: false }
      );

      expect(res.statusCode).toBe(200);
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    });

    it('executes PATCH request through transport', async () => {
      const client = new ZyvanClient({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ patched: true }), { status: 200 })
      );

      const res = await client.patch<{ patched: boolean }>(
        '/v1/destinations/dest_1',
        { url: 'https://new.example.com/webhook' }
      );

      expect(res.statusCode).toBe(200);
      expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
    });

    it('executes DELETE request through transport', async () => {
      const client = new ZyvanClient({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      const res = await client.delete<void>('/v1/destinations/dest_1');

      expect(res.statusCode).toBe(204);
      expect(res.data).toBeUndefined();
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    });
  });

  describe('Legacy Compatibility Surface', () => {
    it('client.events.send sends event with idempotency header', async () => {
      const client = new ZyvanClient({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            event_id: 'evt_123',
            status: 'queued',
            created_at: new Date().toISOString(),
            duplicate: false,
          }),
          { status: 202 }
        )
      );

      const res = await client.events.send({
        type: 'order.placed',
        payload: { orderId: 'ord_99' },
      });

      expect(res.event_id).toBe('evt_123');
      expect(res.status).toBe('queued');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/events',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('ZyvanClient.webhooks.verify verifies HMAC signature', () => {
      const secret = 'whsec_test_secret_123456';
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify({ event: 'test' });
      const signedContent = `${timestamp}.${payload}`;
      const hmac = crypto.createHmac('sha256', secret).update(signedContent).digest('hex');
      const signature = `v1=${hmac}`;

      const isValid = ZyvanClient.webhooks.verify({
        payload,
        signature,
        timestamp,
        secret,
      });

      expect(isValid).toBe(true);

      const isInvalid = ZyvanClient.webhooks.verify({
        payload: 'tampered payload',
        signature,
        timestamp,
        secret,
      });

      expect(isInvalid).toBe(false);
    });
  });
});
