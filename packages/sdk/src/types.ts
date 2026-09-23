// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Types & Request Contracts
// ─────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export type RetrySafety = 'safe' | 'idempotent' | 'unsafe';

export interface RetryContext {
  /**
   * The error or status response that triggered the retry evaluation.
   */
  error: unknown;

  /**
   * The 1-based attempt number that just completed (1 for first attempt, etc.).
   */
  attempt: number;

  /**
   * HTTP method of the request.
   */
  method: HttpMethod;

  /**
   * Whether the operation is naturally or contractually idempotent.
   */
  isIdempotent: boolean;

  /**
   * Idempotency-Key if present on the request.
   */
  idempotencyKey?: string;
}

export interface RetryOptions {
  /**
   * Maximum number of retry attempts.
   * Defaults to 2 (total 3 attempts: 1 initial + 2 retries). Max allowed: 10.
   * Set to 0 to disable retries.
   */
  maxRetries?: number;

  /**
   * Initial backoff delay in milliseconds.
   * Defaults to 500ms.
   */
  initialDelayMs?: number;

  /**
   * Maximum exponential backoff delay in milliseconds.
   * Defaults to 10,000ms (10 seconds).
   */
  maxDelayMs?: number;

  /**
   * Maximum duration in milliseconds to honor a server-provided Retry-After header.
   * Defaults to 60,000ms (60 seconds).
   */
  maxRetryAfterMs?: number;

  /**
   * Exponential backoff multiplier factor.
   * Defaults to 2.
   */
  backoffFactor?: number;

  /**
   * Optional custom predicate to veto a retry.
   * Note: This predicate can only veto an otherwise safe retry;
   * it cannot override the SDK's built-in safety boundaries for unkeyed unsafe mutations.
   */
  shouldRetry?: (context: RetryContext) => boolean;
}

export interface ZyvanClientOptions {
  /**
   * Zyvan Project API key (e.g. zyvan_live_... / zyvan_test_...).
   * Required for all authenticated requests.
   */
  apiKey: string;

  /**
   * Base URL of the Zyvan API server.
   * Defaults to 'https://api.zyvan.dev'.
   */
  baseUrl?: string;

  /**
   * Optional project ID to scope requests via 'X-Project-Id'.
   */
  projectId?: string;

  /**
   * Request timeout in milliseconds.
   * Defaults to 10,000ms (10 seconds).
   */
  timeoutMs?: number;

  /**
   * Custom global HTTP headers sent with every request.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation (useful for testing or non-standard runtimes).
   */
  fetch?: typeof globalThis.fetch;

  /**
   * Retry configuration for transient failures, rate limits, and 5xx errors.
   * Can be set to false to completely disable automatic retries.
   */
  retries?: RetryOptions | boolean;
}

export interface RequestOptions {
  /**
   * Relative request path (e.g. '/v1/events', '/v1/destinations').
   */
  path: string;

  /**
   * HTTP method. Defaults to 'GET'.
   */
  method?: HttpMethod;

  /**
   * URL query parameters. Undefined and null values are automatically omitted.
   */
  query?: Record<string, string | number | boolean | undefined | null>;

  /**
   * Request payload for POST/PUT/PATCH. Automatically serialized to JSON once before attempts.
   */
  body?: unknown;

  /**
   * Request-specific headers.
   */
  headers?: Record<string, string | undefined>;

  /**
   * Explicit Idempotency-Key header for safely retrying mutating operations.
   */
  idempotencyKey?: string;

  /**
   * Operation safety classification.
   * 'safe': Naturally read-only (GET/HEAD).
   * 'idempotent': Mutating operation with guaranteed idempotency contract.
   * 'unsafe': Non-idempotent mutation (never retried on network/timeout/5xx/429).
   * Defaults to 'safe' for GET/HEAD, and 'unsafe' for other methods.
   */
  retrySafety?: RetrySafety;

  /**
   * Override retry behavior for this specific request.
   */
  retries?: RetryOptions | boolean;

  /**
   * Optional project override for this request via 'X-Project-Id'.
   */
  projectId?: string;

  /**
   * Request timeout in milliseconds, overriding the client default.
   */
  timeoutMs?: number;

  /**
   * Optional AbortSignal allowing external cancellation of this request.
   */
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  /**
   * Parsed response data payload.
   */
  data: T;

  /**
   * HTTP status code (e.g. 200, 201, 204).
   */
  statusCode: number;

  /**
   * Request ID extracted from 'x-request-id' response header or body.
   */
  requestId?: string;

  /**
   * Raw response headers.
   */
  headers: Headers;
}

export interface ZyvanApiErrorBody {
  code?: string;
  message?: string;
  request_id?: string;
  details?: unknown;
}
