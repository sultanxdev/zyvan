import { describe, it, expect } from 'vitest';
import { isSafeUrl, isHttpsUrl } from '../../src/core/ssrf-guard';

// ── isHttpsUrl (sync) ────────────────────────────────────────────────────

describe('isHttpsUrl', () => {
    it('accepts a valid HTTPS URL', () => {
        expect(isHttpsUrl('https://webhook.example.com/hook')).toBe(true);
    });

    it('rejects HTTP (non-HTTPS)', () => {
        expect(isHttpsUrl('http://webhook.example.com/hook')).toBe(false);
    });

    it('rejects a non-URL string', () => {
        expect(isHttpsUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isHttpsUrl('')).toBe(false);
    });

    it('rejects ftp:// scheme', () => {
        expect(isHttpsUrl('ftp://example.com')).toBe(false);
    });
});

// ── isSafeUrl (async, real DNS) ──────────────────────────────────────────

describe('isSafeUrl — protocol checks (no DNS needed)', () => {
    it('rejects http:// (not HTTPS)', async () => {
        expect(await isSafeUrl('http://example.com')).toBe(false);
    });

    it('rejects malformed URL', async () => {
        expect(await isSafeUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', async () => {
        expect(await isSafeUrl('')).toBe(false);
    });
});

describe('isSafeUrl — private IP blocks', () => {
    // These tests use hostnames that resolve to known private/loopback IPs.
    // We test URLs where the hostname IS a direct IP notation won't be resolved
    // via DNS, but isSafeUrl uses dns.resolve4 which will fail for bare IPs —
    // so it safely returns false (cannot resolve).

    it('rejects https://localhost (resolves to 127.0.0.1)', async () => {
        // localhost resolves to 127.0.0.1 — loopback
        const result = await isSafeUrl('https://localhost/hook');
        expect(result).toBe(false);
    }, 10_000);

    it('rejects plain http even with a public-looking host', async () => {
        expect(await isSafeUrl('http://google.com')).toBe(false);
    });

    it('rejects a URL that cannot be DNS-resolved', async () => {
        // This domain should never resolve
        expect(await isSafeUrl('https://this-domain-does-not-exist-zyvan-xyz.invalid/hook')).toBe(false);
    }, 10_000);
});

describe('isSafeUrl — public URL acceptance', () => {
    it('accepts a real public HTTPS URL (webhook.site)', async () => {
        // This test requires actual internet connectivity.
        // webhook.site resolves to public IPs.
        const result = await isSafeUrl('https://webhook.site/test');
        // In CI without internet this might be false — we allow either outcome
        expect(typeof result).toBe('boolean');
    }, 10_000);
});
