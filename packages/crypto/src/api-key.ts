// ─────────────────────────────────────────────────────────────
// Zyvan Crypto — API Key Hashing
// API keys are hashed with SHA-256 + pepper before storage.
// The plaintext key is returned to the user exactly once.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';

const API_KEY_PREFIX = 'zyvan_live_';

/**
 * Generate a new API key with a unique random value.
 *
 * @returns Object with the full plaintext key and a short prefix for identification
 */
export function generateApiKey(): { key: string; prefix: string } {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const prefix = key.substring(0, 16); // e.g. "zyvan_live_abc1"
  return { key, prefix };
}

/**
 * Hash an API key with SHA-256 and a pepper for storage.
 * Never store the raw API key in the database.
 *
 * @param key - The plaintext API key
 * @param pepper - Application-level pepper from environment
 * @returns Hex-encoded SHA-256 hash
 */
export function hashApiKey(key: string, pepper: string): string {
  return crypto
    .createHmac('sha256', pepper)
    .update(key, 'utf8')
    .digest('hex');
}

/**
 * Verify an API key against its stored hash.
 *
 * @param key - The plaintext API key from the request
 * @param storedHash - The hash stored in the database
 * @param pepper - Application-level pepper
 * @returns true if the key matches
 */
export function verifyApiKey(key: string, storedHash: string, pepper: string): boolean {
  const computedHash = hashApiKey(key, pepper);
  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}
