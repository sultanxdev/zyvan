// ─────────────────────────────────────────────────────────────
// Zyvan Crypto — HMAC Signing
// Versioned HMAC-SHA256 webhook signatures.
// Sign: timestamp + "." + raw_payload
// Header: X-Zyvan-Signature: v1=<hex_signature>
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';

export interface SignatureResult {
  signature: string;
  timestamp: number;
  header: string; // e.g. "v1=abc123..."
}

/**
 * Generate an HMAC-SHA256 signature for outbound webhook delivery.
 *
 * @param secret - The destination's signing secret (plaintext)
 * @param payload - The raw JSON payload string
 * @param version - Signature version (default "v1")
 * @returns SignatureResult with signature, timestamp, and formatted header
 */
export function signPayload(
  secret: string,
  payload: string,
  version: string = 'v1'
): SignatureResult {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedContent = `${timestamp}.${payload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent, 'utf8')
    .digest('hex');

  return {
    signature,
    timestamp,
    header: `${version}=${signature}`,
  };
}

/**
 * Verify an HMAC-SHA256 signature from an inbound webhook.
 *
 * @param secret - The signing secret
 * @param payload - The raw JSON payload string
 * @param signatureHeader - The signature header value (e.g. "v1=abc123...")
 * @param timestamp - The timestamp from the request
 * @param toleranceSec - Max age in seconds (default 300 = 5 minutes)
 * @returns true if signature is valid and within tolerance
 */
export function verifySignature(
  secret: string,
  payload: string,
  signatureHeader: string,
  timestamp: number,
  toleranceSec: number = 300
): boolean {
  // Check timestamp tolerance (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSec) {
    return false;
  }

  const signedContent = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedContent, 'utf8')
    .digest('hex');

  // Parse version from header
  const parts = signatureHeader.split('=');
  if (parts.length < 2) return false;

  const receivedSignature = parts.slice(1).join('=');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}
