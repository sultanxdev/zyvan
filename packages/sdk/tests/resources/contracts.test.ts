import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZyvanClient } from '../../src/client';
import {
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ServerError,
  NetworkError,
} from '../../src/errors';

describe('PR 4.2: Cross-Resource Contract Invariants', () => {
  const apiKey = 'zyvan_live_secret_key_never_leak_me_12345';
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalGlobalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    originalGlobalFetch = globalThis.fetch;
    // Poison global fetch to prove resources NEVER call global fetch directly
    globalThis.fetch = vi.fn(() => {
      throw new Error('ILLEGAL: Global fetch was called directly instead of using injected transport!');
    });
  });

  afterEach(() => {
    globalThis.fetch = originalGlobalFetch;
  });

  it('all resources dispatch through injected transport and never call global fetch', async () => {
    const client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });

    mockFetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    // Call various resources
    await client.projects.list();
    await client.destinations.list();
    await client.deadLetters.list();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Global fetch was not invoked
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('all resources inject Authorization Bearer token header', async () => {
    const client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    await client.projects.list();

    const headers = mockFetch.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe(`Bearer ${apiKey}`);
  });

  it('all resources inject X-Project-Id header when configured on client', async () => {
    const client = new ZyvanClient({
      apiKey,
      projectId: 'proj_global_test_1',
      fetch: mockFetch as unknown as typeof fetch,
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    await client.destinations.list();

    const headers = mockFetch.mock.calls[0][1].headers as Headers;
    expect(headers.get('X-Project-Id')).toBe('proj_global_test_1');
  });

  it('never leak API keys in error messages or representations', async () => {
    const client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ code: 'forbidden', message: 'Unauthorized project access' }),
        { status: 403 }
      )
    );

    try {
      await client.projects.list();
      expect.unreachable();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AuthorizationError);
      const errStr = String(err);
      expect(errStr).not.toContain(apiKey);
      expect(JSON.stringify(err)).not.toContain(apiKey);
    }
  });

  it('propagates typed SDK errors without wrapping into generic Error', async () => {
    const client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });

    // 401 -> AuthenticationError
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(client.events.list()).rejects.toThrow(AuthenticationError);

    // 403 -> AuthorizationError
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 403 }));
    await expect(client.destinations.list()).rejects.toThrow(AuthorizationError);

    // 429 -> RateLimitError
    mockFetch.mockResolvedValueOnce(
      new Response('{}', {
        status: 429,
        headers: { 'Retry-After': '15' },
      })
    );
    await expect(client.deadLetters.list()).rejects.toThrow(RateLimitError);

    // 500 -> ServerError
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    await expect(client.projects.list()).rejects.toThrow(ServerError);
  });

  it('unwraps response payload directly rather than returning transport envelope', async () => {
    const client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });

    const mockItem = { id: 'dest_42', url: 'https://webhook.site/test', active: true };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockItem }), { status: 200 })
    );

    const result = await client.destinations.get('dest_42');

    // result should be the destination object itself, NOT { data: { id: ... }, statusCode: 200, ... }
    expect(result).toEqual(mockItem);
    expect((result as any).statusCode).toBeUndefined();
    expect((result as any).headers).toBeUndefined();
  });

  it('preserves request<T> returning the full ApiResponse<T> envelope', async () => {
    const client = new ZyvanClient({
      apiKey,
      fetch: mockFetch as unknown as typeof fetch,
    });

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ custom: 'data' }), {
        status: 200,
        headers: { 'x-request-id': 'req_xyz_123' },
      })
    );

    const response = await client.request<{ custom: string }>({
      path: '/v1/custom-endpoint',
    });

    expect(response.statusCode).toBe(200);
    expect(response.requestId).toBe('req_xyz_123');
    expect(response.data).toEqual({ custom: 'data' });
    expect(response.headers).toBeInstanceOf(Headers);
  });
});
