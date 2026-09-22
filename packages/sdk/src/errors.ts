// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Typed Error Hierarchy
// ─────────────────────────────────────────────────────────────

export interface ZyvanErrorOptions {
  statusCode?: number;
  code?: string;
  requestId?: string;
  details?: unknown;
  rawBody?: unknown;
  cause?: Error;
}

/**
 * Base error class for all Zyvan SDK errors.
 * Preserves HTTP status, error codes, request ID for debugging, and details.
 */
export class ZyvanError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;
  public readonly requestId?: string;
  public readonly details?: unknown;
  public readonly rawBody?: unknown;
  public readonly cause?: Error;

  constructor(message: string, options: ZyvanErrorOptions = {}) {
    super(message);
    this.name = 'ZyvanError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
    this.rawBody = options.rawBody;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown on HTTP 401: Invalid, expired, or missing API key.
 */
export class AuthenticationError extends ZyvanError {
  constructor(message = 'Authentication failed: invalid or missing API key', options: ZyvanErrorOptions = {}) {
    super(message, { statusCode: 401, code: 'authentication_failed', ...options });
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown on HTTP 403: Caller lacks permission to perform the action.
 */
export class AuthorizationError extends ZyvanError {
  constructor(message = 'Access denied: insufficient permissions', options: ZyvanErrorOptions = {}) {
    super(message, { statusCode: 403, code: 'authorization_denied', ...options });
    this.name = 'AuthorizationError';
  }
}

/**
 * Thrown on HTTP 400: Malformed request or schema validation failure.
 */
export class ValidationError extends ZyvanError {
  constructor(message = 'Invalid request parameters', options: ZyvanErrorOptions = {}) {
    super(message, { statusCode: 400, code: 'invalid_request', ...options });
    this.name = 'ValidationError';
  }
}

/**
 * Thrown on HTTP 404: The requested resource does not exist in the tenant.
 */
export class NotFoundError extends ZyvanError {
  constructor(message = 'Resource not found', options: ZyvanErrorOptions = {}) {
    super(message, { statusCode: 404, code: 'not_found', ...options });
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown on HTTP 409: Conflict with the current resource state (e.g. duplicate idempotency key or terminal DLQ race).
 */
export class ConflictError extends ZyvanError {
  constructor(message = 'Conflict with current resource state', options: ZyvanErrorOptions = {}) {
    super(message, { statusCode: 409, code: 'conflict', ...options });
    this.name = 'ConflictError';
  }
}

export interface RateLimitErrorOptions extends ZyvanErrorOptions {
  /**
   * Normalized duration in milliseconds until the rate limit resets.
   */
  retryAfter?: number;
  /**
   * Raw 'Retry-After' header value if provided by the server.
   */
  retryAfterHeader?: string;
}

/**
 * Thrown on HTTP 429: Too many requests. Exposes normalized retryAfter in milliseconds.
 */
export class RateLimitError extends ZyvanError {
  public readonly retryAfter?: number;
  public readonly retryAfterHeader?: string;

  constructor(message = 'Too many requests: rate limit exceeded', options: RateLimitErrorOptions = {}) {
    super(message, { statusCode: 429, code: 'rate_limited', ...options });
    this.name = 'RateLimitError';
    this.retryAfter = options.retryAfter;
    this.retryAfterHeader = options.retryAfterHeader;
  }
}

/**
 * Thrown on HTTP 5xx: Server-side failure (500, 502, 503, 504).
 */
export class ServerError extends ZyvanError {
  constructor(message = 'Internal server error encountered', options: ZyvanErrorOptions = {}) {
    super(message, { statusCode: options.statusCode || 500, code: options.code || 'internal_error', ...options });
    this.name = 'ServerError';
  }
}

export type NetworkErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'ABORTED';

export interface NetworkErrorOptions extends ZyvanErrorOptions {
  code?: NetworkErrorCode;
}

/**
 * Thrown when an HTTP request fails before receiving a response
 * (e.g., DNS resolution failure, connection refused, request timeout, or caller abort).
 */
export class NetworkError extends ZyvanError {
  public readonly code: NetworkErrorCode;

  constructor(message = 'Network connection failed or timed out', options: NetworkErrorOptions = {}) {
    const code = options.code || 'NETWORK_ERROR';
    super(message, { ...options, code });
    this.name = 'NetworkError';
    this.code = code;
  }
}

/**
 * Normalizes 'Retry-After' header value into milliseconds.
 * Supports:
 * - Integer seconds: "12" -> 12000
 * - HTTP-date per RFC 7231 / RFC 2616: "Wed, 23 Sep 2026 12:00:00 GMT" -> diff from Date.now() in ms
 */
export function parseRetryAfter(headerValue: string | null | undefined): number | undefined {
  if (!headerValue) return undefined;
  const trimmed = headerValue.trim();
  if (!trimmed) return undefined;

  // Check if integer seconds
  const seconds = Number(trimmed);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  // Check if HTTP-date
  const timestamp = Date.parse(trimmed);
  if (!Number.isNaN(timestamp)) {
    const diff = timestamp - Date.now();
    return Math.max(0, diff);
  }

  return undefined;
}

/**
 * Factory creating the appropriate ZyvanError subclass from HTTP status and response payload.
 */
export function createZyvanErrorFromResponse(params: {
  statusCode: number;
  rawText: string;
  headers: Headers;
}): ZyvanError {
  const { statusCode, rawText, headers } = params;
  const headerRequestId = headers.get('x-request-id') || undefined;

  let parsedBody: unknown = null;
  if (rawText && rawText.trim().length > 0) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      // Non-JSON response (e.g. text/plain, HTML proxy error page, or malformed body)
      parsedBody = null;
    }
  }

  const isRecord = parsedBody !== null && typeof parsedBody === 'object';
  const bodyRecord = isRecord ? (parsedBody as Record<string, unknown>) : null;
  const isHtml = rawText && /^\s*<(!DOCTYPE|html)/i.test(rawText);
  const message =
    (typeof bodyRecord?.message === 'string' ? bodyRecord.message : null) ||
    (typeof parsedBody === 'string' ? parsedBody : null) ||
    (!isHtml && rawText && rawText.length < 200 ? rawText.trim() : null) ||
    `HTTP ${statusCode} error`;

  const code = typeof bodyRecord?.code === 'string' ? bodyRecord.code : undefined;
  const requestId =
    typeof bodyRecord?.request_id === 'string' ? bodyRecord.request_id : headerRequestId;
  const details = bodyRecord?.details !== undefined ? bodyRecord.details : undefined;
  const rawBody = parsedBody !== null ? parsedBody : (rawText || undefined);

  const errorOptions: ZyvanErrorOptions = {
    statusCode,
    code,
    requestId,
    details,
    rawBody,
  };

  switch (statusCode) {
    case 400:
      return new ValidationError(message, errorOptions);
    case 401:
      return new AuthenticationError(message, errorOptions);
    case 403:
      return new AuthorizationError(message, errorOptions);
    case 404:
      return new NotFoundError(message, errorOptions);
    case 409:
      return new ConflictError(message, errorOptions);
    case 429: {
      const retryAfterHeader = headers.get('retry-after') || undefined;
      const retryAfter = parseRetryAfter(retryAfterHeader);
      return new RateLimitError(message, {
        ...errorOptions,
        retryAfter,
        retryAfterHeader,
      });
    }
    default:
      if (statusCode >= 500 && statusCode <= 599) {
        return new ServerError(message, errorOptions);
      }
      return new ZyvanError(message, errorOptions);
  }
}
