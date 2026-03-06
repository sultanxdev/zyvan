import { describe, it, expect } from 'vitest';

/**
 * The calculateBackoffMs function lives inside dispatch.ts, so we
 * re-implement it here to test it in isolation.
 * If the implementation changes, update both files.
 *
 * delay(n) = min(base * 2^n + rand(0, jitter), maxDelay)
 */
function calculateBackoffMs(retryCount: number): number {
    const BASE_MS = 1_000;
    const JITTER_MS = 500;
    const MAX_MS = 3_600_000; // 1 hour
    const delay = BASE_MS * Math.pow(2, retryCount) + Math.random() * JITTER_MS;
    return Math.min(delay, MAX_MS);
}

describe('calculateBackoffMs', () => {
    it('attempt 0 → delay is between 1000ms and 1500ms', () => {
        for (let i = 0; i < 100; i++) {
            const d = calculateBackoffMs(0);
            expect(d).toBeGreaterThanOrEqual(1000);
            expect(d).toBeLessThanOrEqual(1500);
        }
    });

    it('attempt 1 → delay is between 2000ms and 2500ms', () => {
        for (let i = 0; i < 100; i++) {
            const d = calculateBackoffMs(1);
            expect(d).toBeGreaterThanOrEqual(2000);
            expect(d).toBeLessThanOrEqual(2500);
        }
    });

    it('attempt 2 → delay is between 4000ms and 4500ms', () => {
        for (let i = 0; i < 100; i++) {
            const d = calculateBackoffMs(2);
            expect(d).toBeGreaterThanOrEqual(4000);
            expect(d).toBeLessThanOrEqual(4500);
        }
    });

    it('attempt 5 → delay is between 32000ms and 32500ms', () => {
        for (let i = 0; i < 50; i++) {
            const d = calculateBackoffMs(5);
            expect(d).toBeGreaterThanOrEqual(32000);
            expect(d).toBeLessThanOrEqual(32500);
        }
    });

    it('delay is always positive', () => {
        for (let i = 0; i < 20; i++) {
            expect(calculateBackoffMs(i)).toBeGreaterThan(0);
        }
    });

    it('is capped at max (1 hour = 3,600,000ms) for very large retry counts', () => {
        // At attempt 20 the exponential would be ~1 billion ms without the cap
        for (let i = 0; i < 50; i++) {
            const d = calculateBackoffMs(20);
            expect(d).toBeLessThanOrEqual(3_600_000);
        }
    });

    it('delays increase monotonically with retry count (median trend)', () => {
        // Run 200 samples per attempt level and compare medians
        const median = (n: number) => {
            const samples = Array.from({ length: 200 }, () => calculateBackoffMs(n));
            samples.sort((a, b) => a - b);
            return samples[100];
        };
        expect(median(1)).toBeGreaterThan(median(0));
        expect(median(2)).toBeGreaterThan(median(1));
        expect(median(3)).toBeGreaterThan(median(2));
        expect(median(4)).toBeGreaterThan(median(3));
    });
});
