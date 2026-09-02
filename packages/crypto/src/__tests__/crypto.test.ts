import { describe, it, expect } from 'vitest';
import {
  signPayload,
  verifySignature,
  encrypt,
  decrypt,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  validateUrl,
} from '../index';

describe('HMAC Webhook Signing', () => {
  const secret = 'whsec_test_secret_1234567890abcdef';
  const payload = JSON.stringify({ type: 'invoice.paid', data: { amount: 1000 } });

  it('signs payload with HMAC-SHA256 and version prefix', () => {
    const result = signPayload(secret, payload, 'v1');
    expect(result.signature).toBeDefined();
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.header).toBe(`v1=${result.signature}`);
  });

  it('successfully verifies a valid signature within tolerance', () => {
    const result = signPayload(secret, payload, 'v1');
    const isValid = verifySignature(secret, payload, result.header, result.timestamp, 300);
    expect(isValid).toBe(true);
  });

  it('rejects signature if payload was tampered with', () => {
    const result = signPayload(secret, payload, 'v1');
    const tamperedPayload = JSON.stringify({ type: 'invoice.paid', data: { amount: 9999 } });
    const isValid = verifySignature(secret, tamperedPayload, result.header, result.timestamp, 300);
    expect(isValid).toBe(false);
  });

  it('rejects signature if secret is wrong', () => {
    const result = signPayload(secret, payload, 'v1');
    const wrongSecret = 'whsec_wrong_secret_1234567890abcdef';
    const isValid = verifySignature(wrongSecret, payload, result.header, result.timestamp, 300);
    expect(isValid).toBe(false);
  });

  it('rejects signature if timestamp is expired (replay attack)', () => {
    const result = signPayload(secret, payload, 'v1');
    const expiredTimestamp = result.timestamp - 600; // 10 minutes ago
    const isValid = verifySignature(secret, payload, result.header, expiredTimestamp, 300);
    expect(isValid).toBe(false);
  });
});

describe('AES-256-GCM Secret Encryption', () => {
  const encryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const plaintext = 'super_secret_webhook_signing_token_123!';

  it('encrypts and decrypts back to original plaintext', () => {
    const ciphertext = encrypt(plaintext, encryptionKey);
    expect(ciphertext).not.toBe(plaintext);
    expect(typeof ciphertext).toBe('string');

    const decrypted = decrypt(ciphertext, encryptionKey);
    expect(decrypted).toBe(plaintext);
  });

  it('throws when encryption key is invalid length', () => {
    expect(() => encrypt(plaintext, 'shortkey')).toThrow();
  });
});

describe('API Key Generation & Hashing', () => {
  const pepper = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

  it('generates API key with zyvan_live_ prefix', () => {
    const { key, prefix } = generateApiKey();
    expect(key.startsWith('zyvan_live_')).toBe(true);
    expect(prefix.startsWith('zyvan_live_')).toBe(true);
    expect(key.length).toBeGreaterThan(30);
  });

  it('hashes key with pepper and verifies correctly', () => {
    const { key } = generateApiKey();
    const hash = hashApiKey(key, pepper);

    expect(verifyApiKey(key, hash, pepper)).toBe(true);
    expect(verifyApiKey('zyvan_live_wrongkey', hash, pepper)).toBe(false);
  });
});

describe('SSRF Protection', () => {
  it('blocks localhost and loopback addresses', async () => {
    const res1 = await validateUrl('http://localhost/webhook');
    expect(res1.safe).toBe(false);

    const res2 = await validateUrl('http://127.0.0.1:8080/test');
    expect(res2.safe).toBe(false);
  });

  it('blocks private IP ranges (10.x, 172.16-31.x, 192.168.x)', async () => {
    const res1 = await validateUrl('http://10.0.0.1/webhook');
    expect(res1.safe).toBe(false);

    const res2 = await validateUrl('http://192.168.1.1/webhook');
    expect(res2.safe).toBe(false);

    const res3 = await validateUrl('http://172.20.0.1/webhook');
    expect(res3.safe).toBe(false);
  });

  it('blocks cloud metadata IP 169.254.169.254', async () => {
    const res = await validateUrl('http://169.254.169.254/latest/meta-data');
    expect(res.safe).toBe(false);
  });

  it('allows safe public HTTPS endpoints', async () => {
    const res = await validateUrl('https://example.com/webhooks');
    expect(res.safe).toBe(true);
  });
});
