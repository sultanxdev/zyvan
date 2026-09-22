// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Types & Request Contracts
// ─────────────────────────────────────────────────────────────

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
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

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
   * Request payload for POST/PUT/PATCH. Automatically serialized to JSON.
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
