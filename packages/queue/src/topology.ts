// ─────────────────────────────────────────────────────────────
// @zyvan/queue — RabbitMQ Topology Contracts
// Defines shared exchange, queue, and tiered retry routing names.
// Prevents naming drift between API publishers and Workers.
// ─────────────────────────────────────────────────────────────

export const EXCHANGE_EVENTS = 'zyvan.events';
export const QUEUE_DELIVERY = 'zyvan.delivery';
export const ROUTING_KEY_DELIVERY = 'delivery.process';

export interface RetryTier {
  tier: string;
  queue: string;
  ttlMs: number;
  attemptNo: number;
}

export const RETRY_TIERS: RetryTier[] = [
  { tier: '10s', queue: 'zyvan.delivery.retry.10s', ttlMs: 10_000, attemptNo: 1 },
  { tier: '1m', queue: 'zyvan.delivery.retry.1m', ttlMs: 60_000, attemptNo: 2 },
  { tier: '5m', queue: 'zyvan.delivery.retry.5m', ttlMs: 300_000, attemptNo: 3 },
  { tier: '15m', queue: 'zyvan.delivery.retry.15m', ttlMs: 900_000, attemptNo: 4 },
  { tier: '1h', queue: 'zyvan.delivery.retry.1h', ttlMs: 3_600_000, attemptNo: 5 },
];

export const MAX_RETRY_ATTEMPTS = 5;

/**
 * Returns the matching retry tier for a given failed attempt count.
 * Returns null if the attempt count exceeds MAX_RETRY_ATTEMPTS (meaning DLQ transition).
 */
export function getRetryTier(attemptNo: number): RetryTier | null {
  return RETRY_TIERS.find((t) => t.attemptNo === attemptNo) || null;
}
