import { describe, it, expect } from 'vitest';
import { generateSignature, verifySignature } from '../../src/core/signing';
import crypto from 'crypto';

describe('generateSignature', () => {
    it('returns a 64-char hex string (SHA-256)', () => {
        const sig = generateSignature('my-secret', '{"foo":"bar"}');
        expect(sig).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic — same inputs always produce same output', () => {
        const a = generateSignature('secret', 'body');
        const b = generateSignature('secret', 'body');
        expect(a).toBe(b);
    });

    it('is sensitive to secret changes', () => {
        const a = generateSignature('secret-A', 'body');
        const b = generateSignature('secret-B', 'body');
        expect(a).not.toBe(b);
    });

    it('is sensitive to body changes', () => {
        const a = generateSignature('secret', '{"event":"created"}');
        const b = generateSignature('secret', '{"event":"deleted"}');
        expect(a).not.toBe(b);
    });

    it('matches a manually computed HMAC-SHA256', () => {
        const secret = 'test-secret';
        const body = '{"user":"sultan"}';
        const expected = crypto
            .createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('hex');
        expect(generateSignature(secret, body)).toBe(expected);
    });
});

describe('verifySignature', () => {
    it('returns true for a matching signature', () => {
        const secret = 'my-secret';
        const body = '{"payload":42}';
        const sig = generateSignature(secret, body);
        expect(verifySignature(secret, body, sig)).toBe(true);
    });

    it('returns false for a tampered body', () => {
        const secret = 'my-secret';
        const sig = generateSignature(secret, '{"amount":100}');
        expect(verifySignature(secret, '{"amount":999}', sig)).toBe(false);
    });

    it('returns false for a tampered signature', () => {
        const secret = 'my-secret';
        const body = '{"ok":true}';
        // flip the last char
        const sig = generateSignature(secret, body).slice(0, -1) + '0';
        expect(verifySignature(secret, body, sig)).toBe(false);
    });

    it('returns false for a different-length signature (prevents padding oracle)', () => {
        expect(verifySignature('secret', 'body', 'short')).toBe(false);
    });

    it('returns false for an empty signature', () => {
        expect(verifySignature('secret', 'body', '')).toBe(false);
    });
});
