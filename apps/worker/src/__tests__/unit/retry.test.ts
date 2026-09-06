import { describe, it, expect } from 'vitest';
import {
  classifyFailure,
  shouldRetry,
  calculateBackoff,
  parseRetryPolicy,
} from '../../services/retry-service';

describe('Retry Service — Failure Classification', () => {
  it('classifies 5xx status codes as retryable', () => {
    expect(classifyFailure('failed', 500)).toBe('retryable');
    expect(classifyFailure('failed', 502)).toBe('retryable');
    expect(classifyFailure('failed', 503)).toBe('retryable');
    expect(classifyFailure('failed', 504)).toBe('retryable');
  });

  it('classifies timeouts and network errors as retryable', () => {
    expect(classifyFailure('timeout', null)).toBe('retryable');
    expect(classifyFailure('error', null)).toBe('retryable');
  });

  it('classifies 429 Too Many Requests as retryable', () => {
    expect(classifyFailure('failed', 429)).toBe('retryable');
  });

  it('classifies 4xx (except 429) as terminal — do not blindly retry', () => {
    expect(classifyFailure('failed', 400)).toBe('terminal');
    expect(classifyFailure('failed', 401)).toBe('terminal');
    expect(classifyFailure('failed', 403)).toBe('terminal');
    expect(classifyFailure('failed', 404)).toBe('terminal');
    expect(classifyFailure('failed', 422)).toBe('terminal');
  });
});

describe('Retry Service — Should Retry Decision', () => {
  it('allows retry when attempt count is below maxAttempts', () => {
    expect(shouldRetry(1, { maxAttempts: 5 })).toBe(true);
    expect(shouldRetry(4, { maxAttempts: 5 })).toBe(true);
  });

  it('exhausts retry when attempt count reaches or exceeds maxAttempts', () => {
    expect(shouldRetry(5, { maxAttempts: 5 })).toBe(false);
    expect(shouldRetry(6, { maxAttempts: 5 })).toBe(false);
  });
});

describe('Retry Service — Exponential Backoff with Jitter', () => {
  const policy = { baseDelay: 1, maxDelay: 60 };

  it('calculates exponential backoff with positive delay', () => {
    const delay1 = calculateBackoff(1, policy);
    const delay2 = calculateBackoff(2, policy);
    const delay3 = calculateBackoff(3, policy);

    expect(delay1).toBeGreaterThanOrEqual(1000);
    expect(delay2).toBeGreaterThanOrEqual(2000);
    expect(delay3).toBeGreaterThanOrEqual(4000);
  });

  it('caps delay at maxDelay', () => {
    const hugeAttemptDelay = calculateBackoff(20, { baseDelay: 1, maxDelay: 10 });
    // 10 seconds in ms = 10000 ms (+ jitter max capped at maxDelay)
    expect(hugeAttemptDelay).toBeLessThanOrEqual(10000);
  });
});

describe('Retry Service — Policy Parsing', () => {
  it('falls back to defaults when raw policy is undefined or partial', () => {
    const policy = parseRetryPolicy({});
    expect(policy.maxAttempts).toBe(5);
    expect(policy.baseDelay).toBe(1);
    expect(policy.maxDelay).toBe(3600);
  });

  it('preserves configured custom policy values', () => {
    const custom = { maxAttempts: 3, baseDelay: 2, maxDelay: 120 };
    const policy = parseRetryPolicy(custom);
    expect(policy.maxAttempts).toBe(3);
    expect(policy.baseDelay).toBe(2);
    expect(policy.maxDelay).toBe(120);
  });
});
