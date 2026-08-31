// ─────────────────────────────────────────────────────────────
// Zyvan Crypto — Encryption
// AES-256-GCM encryption for destination signing secrets.
// Secrets are encrypted at rest and never exposed in logs or API responses.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The secret to encrypt
 * @param encryptionKey - 32-byte hex-encoded key (64 hex chars)
 * @returns Base64-encoded string containing IV + ciphertext + auth tag
 */
export function encrypt(plaintext: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Format: base64(IV + ciphertext + tag)
  const result = Buffer.concat([iv, encrypted, tag]);
  return result.toString('base64');
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 *
 * @param ciphertext - Base64-encoded string from encrypt()
 * @param encryptionKey - 32-byte hex-encoded key (64 hex chars)
 * @returns The original plaintext
 */
export function decrypt(ciphertext: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  const buffer = Buffer.from(ciphertext, 'base64');

  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(buffer.length - TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH, buffer.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
