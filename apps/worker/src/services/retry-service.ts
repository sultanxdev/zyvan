// ─────────────────────────────────────────────────────────────
// Zyvan Worker — Retry Service
//
// Classifies failures, calculates exponential backoff with
// jitter, and determines whether to retry or move to DLQ.
//
// Strategy:
//   5xx / timeout / network → retryable
//   4xx (except 429)        → terminal
//   429                     → retryable (rate limited)
//
// Backoff: min(baseDelay * 2^attempt + jitter, maxDelay)
// ─────────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;  // seconds
  maxDelay: number;   // seconds
}

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 5,
  baseDelay: 1,
  maxDelay: 3600,
};

/**
 * Classify whether a failure outcome is retryable.
 *
 * Retryable: 5xx, timeout, network error, 429
 * Terminal: 4xx (except 429), invalid request
 */
export function classifyFailure(
  outcome: 'failed' | 'timeout' | 'error',
  statusCode: number | null
): 'retryable' | 'terminal' {
  // Timeout and network errors are always retryable
  if (outcome === 'timeout' || outcome === 'error') {
    return 'retryable';
  }

  // No status code → network failure → retryable
  if (statusCode === null) {
    return 'retryable';
  }

  // 429 Too Many Requests → retryable
  if (statusCode === 429) {
    return 'retryable';
  }

  // 5xx → retryable
  if (statusCode >= 500) {
    return 'retryable';
  }

  // 4xx (except 429) → terminal — don't blindly retry
  if (statusCode >= 400 && statusCode < 500) {
    return 'terminal';
  }

  return 'retryable';
}

/**
 * Determine if we should retry based on attempt count and max.
 */
export function shouldRetry(
  attemptCount: number,
  policy: Partial<RetryPolicy> = {}
): boolean {
  const maxAttempts = policy.maxAttempts || DEFAULT_POLICY.maxAttempts;
  return attemptCount < maxAttempts;
}

/**
 * Calculate the delay before the next retry attempt.
 * Uses exponential backoff with jitter.
 *
 * delay = min(baseDelay * 2^attempt + jitter, maxDelay)
 * jitter = random(0, baseDelay)
 */
export function calculateBackoff(
  attemptNumber: number,
  policy: Partial<RetryPolicy> = {}
): number {
  const baseDelay = policy.baseDelay || DEFAULT_POLICY.baseDelay;
  const maxDelay = policy.maxDelay || DEFAULT_POLICY.maxDelay;

  // Exponential: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);

  // Add jitter: random between 0 and baseDelay
  const jitter = Math.random() * baseDelay;

  // Cap at maxDelay
  const delaySeconds = Math.min(exponentialDelay + jitter, maxDelay);

  // Return milliseconds
  return Math.round(delaySeconds * 1000);
}

/**
 * Parse a retry policy from a destination's JSON config,
 * falling back to defaults for missing fields.
 */
export function parseRetryPolicy(raw: any): RetryPolicy {
  return {
    maxAttempts: raw?.maxAttempts || DEFAULT_POLICY.maxAttempts,
    baseDelay: raw?.baseDelay || DEFAULT_POLICY.baseDelay,
    maxDelay: raw?.maxDelay || DEFAULT_POLICY.maxDelay,
  };
}
