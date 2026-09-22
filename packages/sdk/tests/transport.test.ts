import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpTransport } from '../src/transport';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
} from '../src/errors';

describe('PR 4.1: SDK Transport Layer (HttpTransport)', () => {
  const apiKey = 'zyvan_test_mock_key_xyz123';
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
  });

  describe('Initialization & URL Construction', () => {
    it('throws error if apiKey is empty or missing', () => {
      expect(() => new HttpTransport({ apiKey: '' })).toThrow('requires a non-empty apiKey');
      expect(() => new HttpTransport({ apiKey: '   ' })).toThrow('requires a non-empty apiKey');
      expect(() => new HttpTransport({ apiKey: null as any })).toThrow('requires a non-empty apiKey');
    });

    it('validates baseUrl and rejects invalid protocols', () => {
      expect(() => new HttpTransport({ apiKey, baseUrl: 'invalid-url' })).toThrow('Invalid baseUrl');
      expect(() => new HttpTransport({ apiKey, baseUrl: 'ftp://ftp.zyvan.dev' })).toThrow(
        'Only http: and https: are allowed'
      );
    });

    it('normalizes trailing slash on baseUrl', async () => {
      const transport = new HttpTransport({
        apiKey,
        baseUrl: 'https://api.zyvan.dev/',
        fetch: mockFetch as any,
      });

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await transport.request({ path: '/v1/events' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.zyvan.dev/v1/events',
        expect.anything()
      );
    });

    it('correctly resolves paths against baseUrl with subpath prefix', async () => {
      const transport = new HttpTransport({
        apiKey,
        baseUrl: 'http://localhost:3000/api',
        fetch: mockFetch as any,
      });

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      await transport.request({ path: '/v1/events' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/events',
        expect.anything()
      );
    });

    it('serializes query parameters correctly without dropping false or 0', async () => {
      const transport = new HttpTransport({
        apiKey,
        baseUrl: 'https://api.zyvan.dev',
        fetch: mockFetch as any,
      });

      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      await transport.request({
        path: '/v1/dead-letters',
        query: {
          limit: 10,
          offset: 0,
          active: false,
          search: 'user@example.com',
          ignoredUndefined: undefined,
          ignoredNull: null,
        },
      });

      const calledUrl = new URL(mockFetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('limit')).toBe('10');
      expect(calledUrl.searchParams.get('offset')).toBe('0');
      expect(calledUrl.searchParams.get('active')).toBe('false');
      expect(calledUrl.searchParams.get('search')).toBe('user@example.com');
      expect(calledUrl.searchParams.has('ignoredUndefined')).toBe(false);
      expect(calledUrl.searchParams.has('ignoredNull')).toBe(false);
    });
  });

  describe('Headers & Reserved Header Protection', () => {
    it('sets default security headers Authorization, Accept, and X-Project-Id', async () => {
      const transport = new HttpTransport({
        apiKey,
        projectId: 'proj_123',
        fetch: mockFetch as any,
      });

      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      await transport.request({ path: '/v1/events' });

      const requestInit = mockFetch.mock.calls[0][1];
      const headers = requestInit.headers as Headers;

      expect(headers.get('Authorization')).toBe(`Bearer ${apiKey}`);
      expect(headers.get('Accept')).toBe('application/json');
      expect(headers.get('X-Project-Id')).toBe('proj_123');
    });

    it('sets Idempotency-Key and Content-Type when request has body and idempotencyKey', async () => {
      const transport = new HttpTransport({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 201 }));

      await transport.request({
        path: '/v1/events',
        method: 'POST',
        body: { eventType: 'user.created' },
        idempotencyKey: 'idemp-xyz-999',
      });

      const requestInit = mockFetch.mock.calls[0][1];
      const headers = requestInit.headers as Headers;

      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Idempotency-Key')).toBe('idemp-xyz-999');
      expect(requestInit.body).toBe(JSON.stringify({ eventType: 'user.created' }));
    });

    it('protects reserved security headers from being overwritten by custom headers', async () => {
      const transport = new HttpTransport({
        apiKey: 'real_api_key',
        projectId: 'real_project_id',
        headers: {
          'X-Custom-Global': 'global_value',
          Authorization: 'Bearer malicious_override', // Must be ignored!
        },
        fetch: mockFetch as any,
      });

      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      await transport.request({
        path: '/v1/events',
        headers: {
          'x-project-id': 'hacked_project',       // Must be ignored!
          'idempotency-key': 'tampered_key',      // Must be ignored if not set via requestOptions.idempotencyKey
          'x-custom-request': 'req_value',
        },
        idempotencyKey: 'safe_idempotency_key',
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;

      // SDK security headers strictly prevail
      expect(headers.get('Authorization')).toBe('Bearer real_api_key');
      expect(headers.get('X-Project-Id')).toBe('real_project_id');
      expect(headers.get('Idempotency-Key')).toBe('safe_idempotency_key');
      // Custom headers pass through safely
      expect(headers.get('X-Custom-Global')).toBe('global_value');
      expect(headers.get('x-custom-request')).toBe('req_value');
    });
  });

  describe('Success Status Code Handling (200 - 299)', () => {
    it('parses 200 JSON response and extracts x-request-id', async () => {
      const transport = new HttpTransport({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'evt_1', status: 'queued' }), {
          status: 200,
          headers: { 'x-request-id': 'req_abc123' },
        })
      );

      const res = await transport.request<{ id: string; status: string }>({
        path: '/v1/events/evt_1',
      });

      expect(res.statusCode).toBe(200);
      expect(res.requestId).toBe('req_abc123');
      expect(res.data).toEqual({ id: 'evt_1', status: 'queued' });
    });

    it('handles 204 No Content and empty body gracefully (data = undefined)', async () => {
      const transport = new HttpTransport({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 204,
          headers: { 'x-request-id': 'req_del' },
        })
      );

      const res = await transport.request<void>({
        path: '/v1/destinations/dest_1',
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(204);
      expect(res.data).toBeUndefined();
      expect(res.requestId).toBe('req_del');
    });

    it('handles empty body on 200 (data = undefined)', async () => {
      const transport = new HttpTransport({ apiKey, fetch: mockFetch as any });
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));

      const res = await transport.request<void>({ path: '/v1/ping' });
      expect(res.statusCode).toBe(200);
      expect(res.data).toBeUndefined();
    });
  });

  describe('Error Status Code Handling (400 - 599)', () => {
    const transport = new HttpTransport({ apiKey, fetch: mockFetch as any });

    it('maps 400 to ValidationError', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'invalid_request', message: 'eventType is required' }), {
          status: 400,
          headers: { 'x-request-id': 'req_400' },
        })
      );

      await expect(transport.request({ path: '/v1/events', method: 'POST' })).rejects.toThrow(
        ValidationError
      );
    });

    it('maps 401 to AuthenticationError', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'authentication_failed', message: 'Invalid API key' }), {
          status: 401,
        })
      );

      await expect(transport.request({ path: '/v1/events' })).rejects.toThrow(AuthenticationError);
    });

    it('maps 403 to AuthorizationError', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'authorization_denied', message: 'Requires delivery:manage' }), {
          status: 403,
        })
      );

      await expect(transport.request({ path: '/v1/dead-letters/dl-1/dismiss', method: 'POST' })).rejects.toThrow(
        AuthorizationError
      );
    });

    it('maps 404 to NotFoundError', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'not_found', message: 'Event not found' }), {
          status: 404,
        })
      );

      await expect(transport.request({ path: '/v1/events/unknown' })).rejects.toThrow(NotFoundError);
    });

    it('maps 409 to ConflictError', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'conflict', message: 'Dead letter is already replaying' }), {
          status: 409,
        })
      );

      await expect(transport.request({ path: '/v1/dead-letters/dl-1/replay', method: 'POST' })).rejects.toThrow(
        ConflictError
      );
    });

    it('maps 429 to RateLimitError with retryAfter', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'rate_limited', message: 'Too many requests' }), {
          status: 429,
          headers: { 'retry-after': '12' },
        })
      );

      try {
        await transport.request({ path: '/v1/events', method: 'POST' });
        expect.unreachable('Should have thrown RateLimitError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect(err.statusCode).toBe(429);
        expect(err.retryAfter).toBe(12000);
      }
    });

    it('maps 500, 502, 503, 504 to ServerError', async () => {
      for (const status of [500, 502, 503, 504]) {
        mockFetch.mockResolvedValueOnce(
          new Response(`Server error ${status}`, { status })
        );

        await expect(transport.request({ path: '/v1/health' })).rejects.toThrow(ServerError);
      }
    });
  });

  describe('Timeout and AbortSignal Coordination', () => {
    it('throws NetworkError with code TIMEOUT when request times out', async () => {
      const transport = new HttpTransport({
        apiKey,
        timeoutMs: 50, // 50ms timeout
        fetch: (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('The operation was aborted.'));
            });
          }),
      });

      try {
        await transport.request({ path: '/v1/events' });
        expect.unreachable('Should have timed out');
      } catch (err: any) {
        expect(err).toBeInstanceOf(NetworkError);
        expect(err.code).toBe('TIMEOUT');
        expect(err.message).toContain('Request timed out after 50ms');
      }
    });

    it('throws NetworkError with code ABORTED when caller cancels via AbortSignal', async () => {
      const transport = new HttpTransport({
        apiKey,
        timeoutMs: 5000,
        fetch: (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('The operation was aborted.'));
            });
          }),
      });

      const callerController = new AbortController();

      setTimeout(() => {
        callerController.abort(new Error('Caller cancelled operation'));
      }, 20);

      try {
        await transport.request({
          path: '/v1/events',
          signal: callerController.signal,
        });
        expect.unreachable('Should have been aborted');
      } catch (err: any) {
        expect(err).toBeInstanceOf(NetworkError);
        expect(err.code).toBe('ABORTED');
        expect(err.message).toBe('Request was aborted by caller');
      }
    });

    it('rejects immediately if caller AbortSignal is already aborted', async () => {
      const transport = new HttpTransport({ apiKey, fetch: mockFetch as any });
      const callerController = new AbortController();
      callerController.abort(new Error('Pre-aborted'));

      try {
        await transport.request({
          path: '/v1/events',
          signal: callerController.signal,
        });
        expect.unreachable('Should have thrown pre-abort error');
      } catch (err: any) {
        expect(err).toBeInstanceOf(NetworkError);
        expect(err.code).toBe('ABORTED');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Credential Leakage Protection', () => {
    it('never includes apiKey in request URL or query string', async () => {
      const secretKey = 'zyvan_secret_production_key_sensitive';
      const transport = new HttpTransport({
        apiKey: secretKey,
        fetch: mockFetch as any,
      });

      mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

      await transport.request({
        path: '/v1/events',
        query: { filter: 'active' },
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain(secretKey);
      expect(calledUrl).toBe('https://api.zyvan.dev/v1/events?filter=active');
    });

    it('never leaks apiKey in thrown error messages', async () => {
      const secretKey = 'zyvan_secret_production_key_sensitive';
      const transport = new HttpTransport({
        apiKey: secretKey,
        fetch: mockFetch as any,
      });

      mockFetch.mockResolvedValueOnce(
        new Response('Internal failure', { status: 500 })
      );

      try {
        await transport.request({ path: '/v1/events' });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err.message).not.toContain(secretKey);
        expect(String(err)).not.toContain(secretKey);
      }
    });
  });
});
