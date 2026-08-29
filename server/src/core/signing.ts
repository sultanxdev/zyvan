import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for a given payload body.
 *
 * This is attached as the `X-Zyvan-Signature: sha256=<hex>` header
 * on every outgoing webhook delivery so the receiver can verify authenticity.
 */
export function generateSignature(secret: string, body: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex');
}

/**
 * Timing-safe comparison — verifies a received signature against the expected one.
 * Uses `crypto.timingSafeEqual` to prevent timing attacks.
 */
export function verifySignature(
    secret: string,
    body: string,
    receivedSig: string
): boolean {
    try {
        const expected = generateSignature(secret, body);
        // Both buffers must be the same length for timingSafeEqual
        if (expected.length !== receivedSig.length) return false;
        return crypto.timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(receivedSig, 'hex')
        );
    } catch {
        return false;
    }
}
