// ─────────────────────────────────────────────────────────────
// Zyvan SDK — HTTP Transport Layer
// Zero-dependency fetch-based transport with AbortSignal,
// timeout coordination, reserved header protection, error mapping,
// and operation-safe exponential backoff retry engine.
// ─────────────────────────────────────────────────────────────

import type { ZyvanClientOptions, RequestOptions, ApiResponse, RetryOptions, RetryContext } from './types';
import { NetworkError, createZyvanErrorFromResponse } from './errors';
import {
  resolveRetryOptions,
  isOperationSafe,
  isTransientError,
  shouldRetryRequest,
  calculateBackoffDelay,
  sleep,
} from './retry';

export interface HttpTransportTestHooks {
  sleep?: typeof sleep;
  random?: () => number;
}

const RESERVED_HEADERS = new Set([
  'authorization',
  'x-project-id',
  'idempotency-key',
  'accept',
  'content-type',
]);

export class HttpTransport {
  private readonly apiKey: string;
  private readonly baseUrl: URL;
  private readonly projectId?: string;
  private readonly timeoutMs: number;
  private readonly customHeaders: Record<string, string>;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly clientRetries?: RetryOptions | boolean;
  private readonly sleepFn: typeof sleep;
  private readonly randomFn: () => number;

  constructor(options: ZyvanClientOptions, testHooks?: HttpTransportTestHooks) {
    if (!options?.apiKey || typeof options.apiKey !== 'string' || options.apiKey.trim() === '') {
      throw new Error('ZyvanClient requires a non-empty apiKey');
    }
    this.apiKey = options.apiKey.trim();

    const rawBaseUrl = options.baseUrl || 'https://api.zyvan.dev';
    try {
      this.baseUrl = new URL(rawBaseUrl);
    } catch {
      throw new Error(`Invalid baseUrl: '${rawBaseUrl}'. Must be a valid HTTP or HTTPS URL.`);
    }

    if (this.baseUrl.protocol !== 'http:' && this.baseUrl.protocol !== 'https:') {
      throw new Error(`Invalid baseUrl protocol: '${this.baseUrl.protocol}'. Only http: and https: are allowed.`);
    }

    this.projectId = options.projectId?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.customHeaders = options.headers || {};
    this.fetchFn = options.fetch || globalThis.fetch.bind(globalThis);
    this.clientRetries = options.retries;
    this.sleepFn = testHooks?.sleep || sleep;
    this.randomFn = testHooks?.random || Math.random;
  }

  /**
   * Execute an HTTP request with timeout coordination, authentication,
   * query serialization, operation-safe retry loop, and typed error dispatching.
   */
  public async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    // 1. Build and sanitize URL
    const fullUrl = this.buildUrl(options.path, options.query);

    // 2. Build and sanitize headers with strict reserved header protection
    const headers = this.buildHeaders(options);

    // 3. Serialize request body once before any attempts for exact byte-reproducibility
    let bodyPayload: string | undefined = undefined;
    if (options.body !== undefined) {
      bodyPayload = JSON.stringify(options.body);
      headers.set('Content-Type', 'application/json');
    }

    // 4. Resolve retry configuration and operation safety
    const resolvedRetry = resolveRetryOptions(this.clientRetries, options.retries);
    const method = options.method || 'GET';
    const isIdempotent = isOperationSafe(method, options.retrySafety);

    const callerSignal = options.signal;
    if (callerSignal?.aborted) {
      throw new NetworkError('Request was aborted by caller', {
        code: 'ABORTED',
        cause: callerSignal.reason instanceof Error ? callerSignal.reason : undefined,
      });
    }

    let attempt = 1;
    const maxAttempts = 1 + resolvedRetry.maxRetries;

    while (true) {
      if (callerSignal?.aborted) {
        throw new NetworkError('Request was aborted by caller', {
          code: 'ABORTED',
          cause: callerSignal.reason instanceof Error ? callerSignal.reason : undefined,
        });
      }

      // Coordinate per-attempt timeout and caller cancellation
      const controller = new AbortController();
      let isTimeout = false;
      let timer: NodeJS.Timeout | undefined = undefined;

      const onCallerAbort = () => {
        controller.abort(callerSignal?.reason);
      };

      if (callerSignal) {
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }

      const timeout = options.timeoutMs ?? this.timeoutMs;
      if (timeout > 0) {
        timer = setTimeout(() => {
          isTimeout = true;
          controller.abort(new Error(`Request timed out after ${timeout}ms`));
        }, timeout);
      }

      try {
        const response = await this.fetchFn(fullUrl.toString(), {
          method,
          headers,
          body: bodyPayload,
          signal: controller.signal,
        });

        const headerRequestId = response.headers.get('x-request-id') || undefined;

        // Handle successful responses (200 - 299)
        if (response.ok) {
          if (response.status === 204) {
            return {
              data: undefined as unknown as T,
              statusCode: 204,
              requestId: headerRequestId,
              headers: response.headers,
            };
          }

          const rawText = await response.text();
          if (rawText.trim() === '') {
            return {
              data: undefined as unknown as T,
              statusCode: response.status,
              requestId: headerRequestId,
              headers: response.headers,
            };
          }

          let parsedData: unknown;
          try {
            parsedData = JSON.parse(rawText);
          } catch {
            parsedData = rawText;
          }

          const requestId =
            (parsedData &&
            typeof parsedData === 'object' &&
            'request_id' in parsedData &&
            typeof (parsedData as Record<string, unknown>).request_id === 'string'
              ? ((parsedData as Record<string, unknown>).request_id as string)
              : undefined) || headerRequestId;

          return {
            data: parsedData as T,
            statusCode: response.status,
            requestId,
            headers: response.headers,
          };
        }

        // Handle error status codes (400 - 599)
        const errorRawText = await response.text();
        throw createZyvanErrorFromResponse({
          statusCode: response.status,
          rawText: errorRawText,
          headers: response.headers,
        });
      } catch (err: unknown) {
        let errorToEvaluate: unknown;

        if (isTimeout) {
          errorToEvaluate = new NetworkError(`Request timed out after ${timeout}ms`, {
            code: 'TIMEOUT',
            cause: err instanceof Error ? err : undefined,
          });
        } else if (callerSignal?.aborted) {
          errorToEvaluate = new NetworkError('Request was aborted by caller', {
            code: 'ABORTED',
            cause: callerSignal.reason instanceof Error ? callerSignal.reason : undefined,
          });
        } else if (err instanceof Error && 'statusCode' in err) {
          errorToEvaluate = err;
        } else {
          errorToEvaluate = new NetworkError(
            err instanceof Error ? err.message : 'Network connection failed',
            {
              code: 'NETWORK_ERROR',
              cause: err instanceof Error ? err : undefined,
            }
          );
        }

        // Classify error and safety context
        const transientInfo = isTransientError(errorToEvaluate);
        const retryContext: RetryContext = {
          error: errorToEvaluate,
          attempt,
          method,
          isIdempotent,
          idempotencyKey: options.idempotencyKey,
        };

        const shouldRetry = shouldRetryRequest(
          retryContext,
          resolvedRetry,
          transientInfo
        );

        if (!shouldRetry || attempt >= maxAttempts) {
          // Re-throw the exact final error preserved without wrapping
          throw errorToEvaluate;
        }

        // Calculate backoff delay with full jitter or server Retry-After
        const delay = calculateBackoffDelay(
          attempt,
          resolvedRetry,
          transientInfo.retryAfterMs,
          this.randomFn
        );

        attempt++;

        // Await interruptible sleep (aborted immediately if caller cancels)
        await this.sleepFn(delay, callerSignal);
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
        if (callerSignal) {
          callerSignal.removeEventListener('abort', onCallerAbort);
        }
      }
    }
  }

  /**
   * Safely constructs target URL by resolving path against baseUrl and serializing query params.
   */
  private buildUrl(path: string, query?: RequestOptions['query']): URL {
    const basePath = this.baseUrl.pathname.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = new URL(`${this.baseUrl.origin}${basePath}${cleanPath}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          fullUrl.searchParams.set(key, String(value));
        }
      }
    }

    return fullUrl;
  }

  /**
   * Resolves and prioritizes headers.
   * Precedence:
   * 1. Global custom headers
   * 2. Request custom headers (cannot overwrite reserved headers)
   * 3. SDK-owned security & context headers (strictly win)
   */
  private buildHeaders(options: RequestOptions): Headers {
    const headers = new Headers();

    // 1. Global custom headers (ignoring reserved headers)
    for (const [key, value] of Object.entries(this.customHeaders)) {
      if (!RESERVED_HEADERS.has(key.toLowerCase()) && value !== undefined) {
        headers.set(key, value);
      }
    }

    // 2. Request custom headers (ignoring reserved headers)
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        if (!RESERVED_HEADERS.has(key.toLowerCase()) && value !== undefined) {
          headers.set(key, value);
        }
      }
    }

    // 3. SDK-owned security & context headers
    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${this.apiKey}`);

    const projectId = options.projectId || this.projectId;
    if (projectId) {
      headers.set('X-Project-Id', projectId);
    }

    if (options.idempotencyKey) {
      headers.set('Idempotency-Key', options.idempotencyKey.trim());
    }

    return headers;
  }
}
