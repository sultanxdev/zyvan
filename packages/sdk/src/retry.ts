// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Retry & Backoff Engine
// Operation-safe retry classification, bounded exponential backoff
// with full jitter, and deterministic sleep coordination.
// ─────────────────────────────────────────────────────────────

import type { HttpMethod, RetryOptions, RetryContext, RetrySafety } from './types';
import { NetworkError, RateLimitError, ServerError } from './errors';

export interface ResolvedRetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetryAfterMs: number;
  backoffFactor: number;
  shouldRetry?: (context: RetryContext) => boolean;
}

const DEFAULT_RETRY_OPTIONS: ResolvedRetryOptions = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 10_000,
  maxRetryAfterMs: 60_000,
  backoffFactor: 2,
};

/**
 * Validates and merges client-level and request-level retry options.
 */
export function resolveRetryOptions(
  clientOptions?: RetryOptions | boolean,
  requestOptions?: RetryOptions | boolean
): ResolvedRetryOptions {
  // If explicitly disabled at either level, request overrides client
  if (requestOptions === false) {
    return { ...DEFAULT_RETRY_OPTIONS, maxRetries: 0 };
  }
  if (clientOptions === false && requestOptions === undefined) {
    return { ...DEFAULT_RETRY_OPTIONS, maxRetries: 0 };
  }

  const clientObj = typeof clientOptions === 'object' ? clientOptions : {};
  const requestObj = typeof requestOptions === 'object' ? requestOptions : {};

  // Request-level shouldRetry completely overrides client-level shouldRetry
  const shouldRetry = requestObj.shouldRetry !== undefined
    ? requestObj.shouldRetry
    : clientObj.shouldRetry;

  const maxRetries = requestObj.maxRetries ?? clientObj.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries;
  const initialDelayMs = requestObj.initialDelayMs ?? clientObj.initialDelayMs ?? DEFAULT_RETRY_OPTIONS.initialDelayMs;
  const maxDelayMs = requestObj.maxDelayMs ?? clientObj.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs;
  const maxRetryAfterMs = requestObj.maxRetryAfterMs ?? clientObj.maxRetryAfterMs ?? DEFAULT_RETRY_OPTIONS.maxRetryAfterMs;
  const backoffFactor = requestObj.backoffFactor ?? clientObj.backoffFactor ?? DEFAULT_RETRY_OPTIONS.backoffFactor;

  // Validation
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10) {
    throw new Error(`Invalid maxRetries: ${maxRetries}. Must be an integer between 0 and 10.`);
  }
  if (typeof initialDelayMs !== 'number' || Number.isNaN(initialDelayMs) || initialDelayMs < 0) {
    throw new Error(`Invalid initialDelayMs: ${initialDelayMs}. Must be a non-negative number.`);
  }
  if (typeof maxDelayMs !== 'number' || Number.isNaN(maxDelayMs) || maxDelayMs < initialDelayMs) {
    throw new Error(
      `Invalid maxDelayMs: ${maxDelayMs}. Must be greater than or equal to initialDelayMs (${initialDelayMs}).`
    );
  }
  if (typeof maxRetryAfterMs !== 'number' || Number.isNaN(maxRetryAfterMs) || maxRetryAfterMs < 0) {
    throw new Error(`Invalid maxRetryAfterMs: ${maxRetryAfterMs}. Must be a non-negative number.`);
  }
  if (typeof backoffFactor !== 'number' || Number.isNaN(backoffFactor) || backoffFactor < 1) {
    throw new Error(`Invalid backoffFactor: ${backoffFactor}. Must be at least 1.`);
  }

  return {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    maxRetryAfterMs,
    backoffFactor,
    shouldRetry,
  };
}

/**
 * Determines whether an operation is naturally or contractually idempotent.
 */
export function isOperationSafe(
  method: HttpMethod,
  retrySafety?: RetrySafety
): boolean {
  if (retrySafety === 'safe') return true;
  if (retrySafety === 'idempotent') return true;
  if (retrySafety === 'unsafe') return false;

  // Generic fallback: GET and HEAD are naturally safe; all mutations are unsafe by default
  return method === 'GET' || method === 'HEAD';
}

export interface TransientErrorInfo {
  isTransient: boolean;
  retryAfterMs?: number;
}

/**
 * Classifies an error to determine whether it represents a transient failure.
 */
export function isTransientError(error: unknown): TransientErrorInfo {
  if (error instanceof NetworkError) {
    if (error.code === 'ABORTED') {
      return { isTransient: false };
    }
    // TIMEOUT, FETCH_ERROR, NETWORK_ERROR are transient
    return { isTransient: true };
  }

  if (error instanceof RateLimitError) {
    return {
      isTransient: true,
      retryAfterMs: error.retryAfter,
    };
  }

  if (error instanceof ServerError) {
    // 500, 502, 503, 504 are transient server conditions
    return { isTransient: true };
  }

  if (error && typeof error === 'object' && 'statusCode' in error) {
    const status = (error as { statusCode: number }).statusCode;
    if (status === 408) {
      return { isTransient: true };
    }
    if (status === 429) {
      const retryAfter = 'retryAfter' in error && typeof error.retryAfter === 'number'
        ? error.retryAfter
        : undefined;
      return { isTransient: true, retryAfterMs: retryAfter };
    }
    if (status >= 500 && status <= 599) {
      return { isTransient: true };
    }
  }

  // All 4xx (400, 401, 403, 404, 409) and unknown errors are not transient
  return { isTransient: false };
}

/**
 * Evaluates whether a request should be retried based on:
 * 1. Built-in operation safety boundary (unsafe requests NEVER retry)
 * 2. Transient error classification
 * 3. Max retry attempt boundary
 * 4. Custom shouldRetry predicate (veto only)
 */
export function shouldRetryRequest(
  context: RetryContext,
  resolvedOptions: ResolvedRetryOptions,
  transientInfo: TransientErrorInfo
): boolean {
  // Invariant 1: Unsafe unkeyed mutations can NEVER be retried
  if (!context.isIdempotent) {
    return false;
  }

  // Invariant 2: Error must be transient
  if (!transientInfo.isTransient) {
    return false;
  }

  // Invariant 3: Must not exceed maxRetries
  if (context.attempt > resolvedOptions.maxRetries) {
    return false;
  }

  // Invariant 4: Custom predicate may veto, but cannot force an unsafe retry
  if (resolvedOptions.shouldRetry) {
    try {
      if (!resolvedOptions.shouldRetry(context)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Computes backoff delay in milliseconds.
 * - If retryAfterMs is provided (from HTTP 429), honors it up to maxRetryAfterMs.
 * - Otherwise computes 1-based bounded exponential backoff with full jitter.
 */
export function calculateBackoffDelay(
  retryNumber: number,
  options: ResolvedRetryOptions,
  retryAfterMs?: number,
  randomFn: () => number = Math.random
): number {
  if (retryAfterMs !== undefined && retryAfterMs !== null && !Number.isNaN(retryAfterMs)) {
    if (retryAfterMs <= 0) return 0;
    return Math.min(retryAfterMs, options.maxRetryAfterMs);
  }

  // 1-based retryNumber calculation (retry #1 uses initialDelayMs)
  const exponent = Math.max(0, retryNumber - 1);
  const baseDelay = options.initialDelayMs * Math.pow(options.backoffFactor, exponent);
  const cappedBase = Math.min(options.maxDelayMs, baseDelay);

  // Full jitter: random between 0 and cappedBase
  return randomFn() * cappedBase;
}

/**
 * Cancellable sleep utility coordinating with AbortSignal.
 */
export async function sleep(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    throw new NetworkError('Request was aborted by caller', {
      code: 'ABORTED',
      cause: signal.reason instanceof Error ? signal.reason : undefined,
    });
  }

  if (ms <= 0) return;

  return new Promise<void>((resolve, reject) => {
    let timer: NodeJS.Timeout | undefined;

    const onAbort = () => {
      if (timer) clearTimeout(timer);
      reject(
        new NetworkError('Request was aborted by caller', {
          code: 'ABORTED',
          cause: signal?.reason instanceof Error ? signal.reason : undefined,
        })
      );
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);
  });
}
