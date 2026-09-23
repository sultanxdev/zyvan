import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZyvanClient } from '../src/client';
import { HttpTransport } from '../src/transport';
import {
  NetworkError,
  ServerError,
  RateLimitError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from '../src/errors';
import {
  resolveRetryOptions,
  calculateBackoffDelay,
  isOperationSafe,
  isTransientError,
  shouldRetryRequest,
  sleep,
} from '../src/retry';
import type { RetryContext } from '../src/types';

describe('PR 4.3: SDK Retries, Backoff with Jitter & Idempotency Preservation', () => {
  const apiKey = 'zyvan_test_api_key_123';
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockSleep: ReturnType<typeof vi.fn>;
  let mockRandom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    mockSleep = vi.fn().mockResolvedValue(undefined);
    mockRandom = vi.fn().mockReturnValue(0.5); // Predictable jitter mid-point
  });

  function createTestClient(options = {}) {
    return new ZyvanClient(
      {
        apiKey,
        fetch: mockFetch as unknown as typeof fetch,
        ...options,
      },
      {
        sleep: mockSleep as unknown as typeof sleep,
        random: mockRandom,
      }
    );
  }

  function createTestTransport(options = {}) {
    return new HttpTransport(
      {
        apiKey,
        fetch: mockFetch as unknown as typeof fetch,
        ...options,
      },
      {
        sleep: mockSleep as unknown as typeof sleep,
        random: mockRandom,
      }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Critical Safety Tests (Unsafe Mutations NEVER Retry)
  // ─────────────────────────────────────────────────────────────
  describe('Unsafe Mutation Protection', () => {
    it('unkeyed POST + network error fails immediately on attempt 1 without retry', async () => {
      const transport = createTestTransport();
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow(NetworkError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('unkeyed POST + timeout fails immediately on attempt 1 without retry', async () => {
      const transport = createTestTransport({ timeoutMs: 10 });
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50))
      );

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow('timed out');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('unkeyed POST + 500 Internal Server Error fails on attempt 1', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('unkeyed POST + 502 Bad Gateway fails on attempt 1', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }));

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('unkeyed POST + 503 Service Unavailable fails on attempt 1', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('unkeyed POST + 504 Gateway Timeout fails on attempt 1', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(new Response('Gateway Timeout', { status: 504 }));

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('unkeyed POST + 429 RateLimit fails on attempt 1 without retry', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(
        new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '5' },
        })
      );

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow(RateLimitError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('unkeyed POST + 408 Request Timeout fails on attempt 1', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(new Response('Request Timeout', { status: 408 }));

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://example.com' },
        })
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('unkeyed PATCH fails on 503 without retry', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(
        transport.request({
          path: '/v1/destinations/dest_1',
          method: 'PATCH',
          body: { active: false },
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('unkeyed DELETE fails on 503 without retry', async () => {
      const transport = createTestTransport();
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(
        transport.request({
          path: '/v1/destinations/dest_1',
          method: 'DELETE',
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('generic client.request POST fails on 503 without retry', async () => {
      const client = createTestClient();
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(
        client.request({
          path: '/v1/custom',
          method: 'POST',
          body: { foo: 'bar' },
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Safe & Idempotent Operations (Retries Successfully)
  // ─────────────────────────────────────────────────────────────
  describe('Safe & Contractually Idempotent Retries', () => {
    it('safe GET + 503 retries and succeeds on attempt 2', async () => {
      const client = createTestClient();
      mockFetch
        .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: [{ id: 'p1' }] }), { status: 200 })
        );

      const res = await client.projects.list();
      expect(res).toEqual([{ id: 'p1' }]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockSleep).toHaveBeenCalledTimes(1);
    });

    it('safe GET + 408 retries and succeeds on attempt 2', async () => {
      const transport = createTestTransport();
      mockFetch
        .mockResolvedValueOnce(new Response('Request Timeout', { status: 408 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const res = await transport.request<{ ok: boolean }>({ path: '/v1/health' });
      expect(res.data).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('contractually idempotent events.send retries on network error and succeeds', async () => {
      const client = createTestClient();
      mockFetch
        .mockRejectedValueOnce(new TypeError('Connection reset by peer'))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              event_id: 'evt_retry_1',
              status: 'queued',
              created_at: '2026-09-23T00:00:00.000Z',
              duplicate: false,
            }),
            { status: 202 }
          )
        );

      const res = await client.events.send({
        type: 'user.created',
        payload: { userId: 'u_1' },
      });

      expect(res.event_id).toBe('evt_retry_1');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockSleep).toHaveBeenCalledTimes(1);
    });

    it('contractually idempotent deadLetters.replay retries on 500 and succeeds', async () => {
      const client = createTestClient();
      mockFetch
        .mockResolvedValueOnce(new Response('DB Lock', { status: 500 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                status: 'created',
                replayId: 'rep_1',
                deliveryId: 'del_1',
                deadLetterId: 'dlq_1',
                replayStatus: 'pending',
                createdAt: '2026-09-23T00:00:00.000Z',
              },
            }),
            { status: 202 }
          )
        );

      const res = await client.deadLetters.replay('dlq_1', {
        idempotencyKey: 'replay_key_abc',
      });

      expect(res.replayId).toBe('rep_1');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('contractually idempotent deadLetters.replayBulk retries on 503', async () => {
      const client = createTestClient();
      mockFetch
        .mockResolvedValueOnce(new Response('Gateway Hiccup', { status: 503 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                status: 'created',
                batchId: 'batch_1',
                requested: 1,
                accepted: 1,
                skipped: 0,
                batchStatus: 'processing',
                replays: [],
              },
            }),
            { status: 202 }
          )
        );

      const res = await client.deadLetters.replayBulk({}, {
        idempotencyKey: 'bulk_key_abc',
      });

      expect(res.batchId).toBe('batch_1');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('contractually idempotent request retries on 429 and honors Retry-After header', async () => {
      const client = createTestClient();
      mockFetch
        .mockResolvedValueOnce(
          new Response('Rate Limited', {
            status: 429,
            headers: { 'Retry-After': '2' }, // 2 seconds
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              event_id: 'evt_rate_limited',
              status: 'queued',
              created_at: '2026-09-23T00:00:00.000Z',
              duplicate: false,
            }),
            { status: 202 }
          )
        );

      await client.events.send({
        type: 'test.event',
        payload: {},
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockSleep).toHaveBeenCalledWith(2000, undefined);
    });

    it('explicit retrySafety: idempotent on PATCH retries on 503', async () => {
      const transport = createTestTransport();
      mockFetch
        .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ patched: true }), { status: 200 }));

      const res = await transport.request<{ patched: boolean }>({
        path: '/v1/destinations/dest_1',
        method: 'PATCH',
        body: { active: true },
        retrySafety: 'idempotent',
        idempotencyKey: 'patch_idemp_key',
      });

      expect(res.data).toEqual({ patched: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Idempotency & Payload Integrity Invariants
  // ─────────────────────────────────────────────────────────────
  describe('Idempotency & Payload Invariants', () => {
    it('preserves exact same Idempotency-Key across all retry attempts', async () => {
      const client = createTestClient();
      mockFetch
        .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
        .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              event_id: 'evt_final',
              status: 'queued',
              created_at: '2026-09-23T00:00:00.000Z',
              duplicate: false,
            }),
            { status: 202 }
          )
        );

      await client.events.send(
        { type: 'payment.processed', payload: { id: 1 } },
        { idempotencyKey: 'idemp_stable_123' }
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);

      for (let i = 0; i < 3; i++) {
        const headers = mockFetch.mock.calls[i][1].headers as Headers;
        expect(headers.get('Idempotency-Key')).toBe('idemp_stable_123');
      }
    });

    it('preserves byte-identical serialized JSON body across all retry attempts', async () => {
      const client = createTestClient();
      mockFetch
        .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              event_id: 'evt_1',
              status: 'queued',
              created_at: '2026-09-23T00:00:00.000Z',
              duplicate: false,
            }),
            { status: 202 }
          )
        );

      await client.events.send(
        { type: 'order.placed', payload: { item: 'widget', count: 42 } },
        { idempotencyKey: 'idemp_body_check' }
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);

      const bodyAttempt1 = mockFetch.mock.calls[0][1].body;
      const bodyAttempt2 = mockFetch.mock.calls[1][1].body;

      expect(bodyAttempt1).toBe(bodyAttempt2);
      expect(typeof bodyAttempt1).toBe('string');
      expect(JSON.parse(bodyAttempt1 as string)).toEqual({
        type: 'order.placed',
        data: { item: 'widget', count: 42 },
        idempotency_key: 'idemp_body_check',
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Retry Exhaustion & Final Error Preservation
  // ─────────────────────────────────────────────────────────────
  describe('Retry Exhaustion & Error Preservation', () => {
    it('exhausts retries and rethrows final ServerError (3 total attempts)', async () => {
      const client = createTestClient();
      mockFetch
        .mockResolvedValueOnce(new Response('503 attempt 1', { status: 503 }))
        .mockResolvedValueOnce(new Response('503 attempt 2', { status: 503 }))
        .mockResolvedValueOnce(new Response('503 attempt 3', { status: 503 }));

      try {
        await client.projects.list();
        expect.unreachable();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ServerError);
        expect((err as ServerError).statusCode).toBe(503);
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockSleep).toHaveBeenCalledTimes(2);
    });

    it('exhausts retries on repeated timeout and throws NetworkError(TIMEOUT)', async () => {
      const transport = createTestTransport({ timeoutMs: 10 });
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50))
      );

      try {
        await transport.request({ path: '/v1/health' });
        expect.unreachable();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NetworkError);
        expect((err as NetworkError).code).toBe('TIMEOUT');
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('non-transient errors (400, 401, 403, 404, 409) fail on attempt 1 without retry', async () => {
      const transport = createTestTransport();

      // 400
      mockFetch.mockResolvedValueOnce(new Response('Bad Request', { status: 400 }));
      await expect(transport.request({ path: '/v1/health' })).rejects.toThrow(ValidationError);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 401
      mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
      await expect(transport.request({ path: '/v1/health' })).rejects.toThrow(AuthenticationError);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // 403
      mockFetch.mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
      await expect(transport.request({ path: '/v1/health' })).rejects.toThrow(AuthorizationError);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // 404
      mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404 }));
      await expect(transport.request({ path: '/v1/health' })).rejects.toThrow(NotFoundError);
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // 409
      mockFetch.mockResolvedValueOnce(new Response('Conflict', { status: 409 }));
      await expect(transport.request({ path: '/v1/health' })).rejects.toThrow(ConflictError);
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Configuration Validation & Merging
  // ─────────────────────────────────────────────────────────────
  describe('Configuration Validation & Merging', () => {
    it('disables retries when retries: false on client', async () => {
      const client = createTestClient({ retries: false });
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(client.projects.list()).rejects.toThrow(ServerError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('disables retries when maxRetries: 0 on client', async () => {
      const client = createTestClient({ retries: { maxRetries: 0 } });
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(client.projects.list()).rejects.toThrow(ServerError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('overrides client retries with request retries', async () => {
      const transport = createTestTransport({ retries: { maxRetries: 1 } });
      mockFetch
        .mockResolvedValueOnce(new Response('503 - 1', { status: 503 }))
        .mockResolvedValueOnce(new Response('503 - 2', { status: 503 }))
        .mockResolvedValueOnce(new Response('503 - 3', { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      // Override maxRetries to 3 for this request
      const res = await transport.request<{ ok: boolean }>({
        path: '/v1/health',
        retries: { maxRetries: 3 },
      });

      expect(res.data).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('disables retries per request via retries: false', async () => {
      const transport = createTestTransport({ retries: { maxRetries: 3 } });
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(
        transport.request({
          path: '/v1/health',
          retries: false,
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws validation errors for invalid retry configurations', () => {
      expect(() => resolveRetryOptions({ maxRetries: -1 })).toThrow('maxRetries');
      expect(() => resolveRetryOptions({ maxRetries: 11 })).toThrow('maxRetries');
      expect(() => resolveRetryOptions({ initialDelayMs: -10 })).toThrow('initialDelayMs');
      expect(() => resolveRetryOptions({ initialDelayMs: 1000, maxDelayMs: 500 })).toThrow('maxDelayMs');
      expect(() => resolveRetryOptions({ maxRetryAfterMs: -1 })).toThrow('maxRetryAfterMs');
      expect(() => resolveRetryOptions({ backoffFactor: 0.5 })).toThrow('backoffFactor');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Safety Predicate (shouldRetry Veto-Only Behavior)
  // ─────────────────────────────────────────────────────────────
  describe('Safety Predicate (shouldRetry)', () => {
    it('shouldRetry can veto an otherwise safe retry', async () => {
      const client = createTestClient({
        retries: {
          shouldRetry: (ctx: RetryContext) => {
            // Veto retry if method is GET
            return ctx.method !== 'GET';
          },
        },
      });

      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(client.projects.list()).rejects.toThrow(ServerError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('shouldRetry CANNOT override safety to retry an unkeyed mutation', async () => {
      const transport = createTestTransport({
        retries: {
          // Attempting to force retry on unsafe mutation
          shouldRetry: () => true,
        },
      });

      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      await expect(
        transport.request({
          path: '/v1/destinations',
          method: 'POST',
          body: { url: 'https://unsafe.com' },
        })
      ).rejects.toThrow(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('request-level shouldRetry completely overrides client-level shouldRetry', async () => {
      const clientVeto = vi.fn().mockReturnValue(false);
      const requestAllow = vi.fn().mockReturnValue(true);

      const transport = createTestTransport({
        retries: { shouldRetry: clientVeto },
      });

      mockFetch
        .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const res = await transport.request<{ ok: boolean }>({
        path: '/v1/health',
        retries: { shouldRetry: requestAllow },
      });

      expect(res.data).toEqual({ ok: true });
      expect(clientVeto).not.toHaveBeenCalled();
      expect(requestAllow).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Backoff Timing, Full Jitter, and Retry-After Calculations
  // ─────────────────────────────────────────────────────────────
  describe('Backoff Calculation & Retry-After', () => {
    const opts = resolveRetryOptions({
      initialDelayMs: 500,
      backoffFactor: 2,
      maxDelayMs: 5000,
      maxRetryAfterMs: 30000,
    });

    it('calculates 1-based exponential delays with full jitter correctly', () => {
      // With randomFn returning 1.0 (max bound):
      const maxRandom = () => 1.0;
      expect(calculateBackoffDelay(1, opts, undefined, maxRandom)).toBe(500); // 500 * 2^0
      expect(calculateBackoffDelay(2, opts, undefined, maxRandom)).toBe(1000); // 500 * 2^1
      expect(calculateBackoffDelay(3, opts, undefined, maxRandom)).toBe(2000); // 500 * 2^2
      expect(calculateBackoffDelay(4, opts, undefined, maxRandom)).toBe(4000); // 500 * 2^3
      expect(calculateBackoffDelay(5, opts, undefined, maxRandom)).toBe(5000); // capped at maxDelayMs (5000)

      // With randomFn returning 0.5:
      const midRandom = () => 0.5;
      expect(calculateBackoffDelay(1, opts, undefined, midRandom)).toBe(250);
      expect(calculateBackoffDelay(2, opts, undefined, midRandom)).toBe(500);
    });

    it('honors server Retry-After seconds taking precedence over exponential delay', () => {
      const delay = calculateBackoffDelay(1, opts, 15000, () => 1.0);
      expect(delay).toBe(15000); // 15s server duration honored (not capped by maxDelayMs 5000)
    });

    it('caps Retry-After at maxRetryAfterMs', () => {
      const delay = calculateBackoffDelay(1, opts, 45000, () => 1.0);
      expect(delay).toBe(30000); // capped at maxRetryAfterMs (30000)
    });

    it('treats past or zero Retry-After as 0ms delay', () => {
      expect(calculateBackoffDelay(1, opts, 0)).toBe(0);
      expect(calculateBackoffDelay(1, opts, -500)).toBe(0);
    });

    it('falls back to exponential backoff when Retry-After is undefined or malformed', () => {
      const delay = calculateBackoffDelay(1, opts, undefined, () => 1.0);
      expect(delay).toBe(500);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Caller Cancellation at In-Flight & Backoff Sleep Stages
  // ─────────────────────────────────────────────────────────────
  describe('Caller Cancellation (AbortSignal)', () => {
    it('cancels immediately during in-flight fetch and does not retry', async () => {
      const transport = createTestTransport();
      const controller = new AbortController();

      mockFetch.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            // Simulate slow network request
            setTimeout(() => {
              reject(new TypeError('Aborted by signal'));
            }, 100);
          })
      );

      // Abort after 20ms while fetch is in flight
      setTimeout(() => controller.abort(), 20);

      try {
        await transport.request({
          path: '/v1/health',
          signal: controller.signal,
        });
        expect.unreachable();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NetworkError);
        expect((err as NetworkError).code).toBe('ABORTED');
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('cancels immediately during backoff sleep without executing next retry attempt', async () => {
      const transport = new HttpTransport(
        {
          apiKey,
          fetch: mockFetch as unknown as typeof fetch,
        },
        {
          // Real sleep with real timer
          sleep,
          random: () => 1.0,
        }
      );

      const controller = new AbortController();

      // Attempt 1 fails with 503
      mockFetch.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }));

      // Abort while waiting for backoff sleep
      setTimeout(() => controller.abort(), 50);

      try {
        await transport.request({
          path: '/v1/health',
          signal: controller.signal,
          retries: { initialDelayMs: 200 },
        });
        expect.unreachable();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NetworkError);
        expect((err as NetworkError).code).toBe('ABORTED');
      }

      // Proves attempt 2 never ran
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
