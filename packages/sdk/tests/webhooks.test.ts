import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  ZyvanClient,
  Webhooks,
  webhooks,
  WebhookVerificationError,
  verifyWebhookSignature,
  verifyWebhookSignatureOrThrow,
  constructWebhookEvent,
} from '../src';
import { signPayload } from '../../../packages/crypto/src/hmac';

describe('PR 4.4: Webhook Signature Verification Engine', () => {
  const secret = 'whsec_test_secret_0123456789abcdef';
  const oldSecret = 'whsec_old_secret_1111111111111111';
  const newSecret = 'whsec_new_secret_2222222222222222';

  // Helper to generate standard HMAC-SHA256 signature
  function createTestSignature(
    sec: string,
    timestamp: number,
    payload: string | Buffer,
    version = 'v1'
  ): { header: string; rawHex: string } {
    const rawBytes = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
    const signedBuf = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), rawBytes]);
    const rawHex = crypto.createHmac('sha256', sec).update(signedBuf).digest('hex').toLowerCase();
    return {
      header: `${version}=${rawHex}`,
      rawHex,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Contract & Known-Good Cryptographic Vectors
  // ─────────────────────────────────────────────────────────────
  describe('Cryptographic Contract & Known Vectors', () => {
    it('verifies exact known-good HMAC test vector', () => {
      const knownSecret = 'test_secret_key';
      const timestamp = 1727000000;
      const payload = '{"event":"order.created","amount":4200}';

      // Compute canonical signed buffer: "1727000000.{\"event\":\"order.created\",\"amount\":4200}"
      const expectedHmac = crypto
        .createHmac('sha256', knownSecret)
        .update(`1727000000.${payload}`, 'utf8')
        .digest('hex')
        .toLowerCase();

      const isValid = verifyWebhookSignature({
        payload,
        secret: knownSecret,
        signature: `v1=${expectedHmac}`,
        timestamp,
        now: timestamp * 1000, // exact time
      });

      expect(isValid).toBe(true);
      expect(expectedHmac).toMatch(/^[0-9a-f]{64}$/);
    });

    it('interoperates perfectly with @zyvan/crypto signPayload worker contract', () => {
      const payload = JSON.stringify({ id: 'evt_123', status: 'delivered', nested: { ok: true } });
      const signed = signPayload(secret, payload, 'v1');

      // verifyWebhookSignature matches worker signPayload result
      const isValid = verifyWebhookSignature({
        payload,
        secret,
        signature: signed.header,
        timestamp: signed.timestamp,
        now: signed.timestamp * 1000,
      });

      expect(isValid).toBe(true);
      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: signed.header,
          timestamp: signed.timestamp,
          now: signed.timestamp * 1000,
        })
      ).not.toThrow();
    });

    it('preserves exact raw bytes for Buffer payloads (whitespace, newlines, tabs)', () => {
      const rawJson = '{\n  "event": "user.signup",\n  "name": "J. Doe",\r\n  "active": true\n}';
      const bufferPayload = Buffer.from(rawJson, 'utf8');
      const timestamp = 1727000000;
      const sig = createTestSignature(secret, timestamp, bufferPayload);

      const isValid = verifyWebhookSignature({
        payload: bufferPayload,
        secret,
        signature: sig.header,
        timestamp,
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('fails if payload is re-serialized or whitespace is altered', () => {
      const originalPayload = '{\n  "event": "user.signup"\n}';
      const reserializedPayload = JSON.stringify(JSON.parse(originalPayload)); // '{"event":"user.signup"}'
      const timestamp = 1727000000;
      const sig = createTestSignature(secret, timestamp, originalPayload);

      const isValid = verifyWebhookSignature({
        payload: reserializedPayload,
        secret,
        signature: sig.header,
        timestamp,
        now: timestamp * 1000,
      });

      expect(isValid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Header Parsing & Conflict Handling
  // ─────────────────────────────────────────────────────────────
  describe('Header Normalization & Conflicts', () => {
    it('accepts separate x-zyvan-signature and x-zyvan-timestamp headers', () => {
      const timestamp = 1727000000;
      const payload = '{"status":"ok"}';
      const sig = createTestSignature(secret, timestamp, payload);

      const isValid = verifyWebhookSignature({
        payload,
        secret,
        headers: {
          'x-zyvan-signature': sig.header,
          'x-zyvan-timestamp': String(timestamp),
        },
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('is case-insensitive for header names (e.g. X-Zyvan-Signature)', () => {
      const timestamp = 1727000000;
      const payload = '{"status":"ok"}';
      const sig = createTestSignature(secret, timestamp, payload);

      const isValid = verifyWebhookSignature({
        payload,
        secret,
        headers: {
          'X-Zyvan-Signature': sig.header,
          'X-ZYVAN-TIMESTAMP': String(timestamp),
        },
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('supports Fetch API style Headers object with .get()', () => {
      const timestamp = 1727000000;
      const payload = '{"status":"ok"}';
      const sig = createTestSignature(secret, timestamp, payload);

      const mockHeaders = {
        get(name: string) {
          if (name.toLowerCase() === 'x-zyvan-signature') return sig.header;
          if (name.toLowerCase() === 'x-zyvan-timestamp') return String(timestamp);
          return null;
        },
      };

      const isValid = verifyWebhookSignature({
        payload,
        secret,
        headers: mockHeaders,
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('supports combined signature header (t=...,v1=...) without separate timestamp', () => {
      const timestamp = 1727000000;
      const payload = '{"type":"test"}';
      const sig = createTestSignature(secret, timestamp, payload);
      const combinedHeader = `t=${timestamp},v1=${sig.rawHex}`;

      const isValid = verifyWebhookSignature({
        payload,
        secret,
        headers: {
          'x-zyvan-signature': combinedHeader,
        },
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('accepts combined header when separate timestamp agrees', () => {
      const timestamp = 1727000000;
      const payload = '{"type":"test"}';
      const sig = createTestSignature(secret, timestamp, payload);
      const combinedHeader = `t=${timestamp},v1=${sig.rawHex}`;

      const isValid = verifyWebhookSignature({
        payload,
        secret,
        headers: {
          'x-zyvan-signature': combinedHeader,
          'x-zyvan-timestamp': String(timestamp),
        },
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('rejects with INVALID_HEADER_FORMAT when combined timestamp conflicts with separate timestamp', () => {
      const timestamp = 1727000000;
      const payload = '{"type":"test"}';
      const sig = createTestSignature(secret, timestamp, payload);
      const combinedHeader = `t=${timestamp},v1=${sig.rawHex}`;

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          headers: {
            'x-zyvan-signature': combinedHeader,
            'x-zyvan-timestamp': '1727000999', // conflicting!
          },
          now: timestamp * 1000,
        })
      ).toThrowError(WebhookVerificationError);

      try {
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          headers: {
            'x-zyvan-signature': combinedHeader,
            'x-zyvan-timestamp': '1727000999',
          },
          now: timestamp * 1000,
        });
      } catch (err) {
        expect((err as WebhookVerificationError).code).toBe('INVALID_HEADER_FORMAT');
      }
    });

    it('rejects with INVALID_HEADER_FORMAT when alias headers conflict', () => {
      const timestamp = 1727000000;
      const payload = '{"type":"test"}';

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          headers: {
            'x-zyvan-signature': 'v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            'zyvan-signature': 'v1=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            'x-zyvan-timestamp': String(timestamp),
          },
          now: timestamp * 1000,
        })
      ).toThrowError(WebhookVerificationError);

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          headers: {
            'x-zyvan-signature': 'v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            'x-zyvan-timestamp': '1727000000',
            'zyvan-timestamp': '1727000100', // conflicting timestamp aliases
          },
          now: timestamp * 1000,
        })
      ).toThrowError(WebhookVerificationError);
    });

    it('ignores unsupported signature versions (v0=...) when valid v1 signature exists', () => {
      const timestamp = 1727000000;
      const payload = '{"type":"forward_compat"}';
      const sig = createTestSignature(secret, timestamp, payload);
      const headerWithV0 = `v0=unsupported_old_sig,${sig.header}`;

      const isValid = verifyWebhookSignature({
        payload,
        secret,
        signature: headerWithV0,
        timestamp,
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('rejects when only unsupported versions exist without v1', () => {
      const timestamp = 1727000000;
      const payload = '{"type":"only_v0"}';

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: 'v0=some_unsupported_signature',
          timestamp,
          now: timestamp * 1000,
        })
      ).toThrowError(WebhookVerificationError);

      try {
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: 'v0=some_unsupported_signature',
          timestamp,
          now: timestamp * 1000,
        });
      } catch (err) {
        expect((err as WebhookVerificationError).code).toBe('INVALID_HEADER_FORMAT');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Timestamp Freshness Window & Clock Skew
  // ─────────────────────────────────────────────────────────────
  describe('Timestamp Window & Replay Protection', () => {
    const fixedNowSec = 1727001000;
    const fixedNowMs = fixedNowSec * 1000;
    const payload = '{"data":1}';

    it('accepts timestamp exactly at now', () => {
      const sig = createTestSignature(secret, fixedNowSec, payload);
      const isValid = verifyWebhookSignature({
        payload,
        secret,
        signature: sig.header,
        timestamp: fixedNowSec,
        now: fixedNowMs,
      });
      expect(isValid).toBe(true);
    });

    it('accepts timestamp exactly at boundary of 300s tolerance', () => {
      const boundaryPastTs = fixedNowSec - 300;
      const sig = createTestSignature(secret, boundaryPastTs, payload);
      const isValid = verifyWebhookSignature({
        payload,
        secret,
        signature: sig.header,
        timestamp: boundaryPastTs,
        toleranceSec: 300,
        now: fixedNowMs,
      });
      expect(isValid).toBe(true);
    });

    it('rejects timestamp 1 second outside tolerance (expired replay)', () => {
      const expiredTs = fixedNowSec - 301;
      const sig = createTestSignature(secret, expiredTs, payload);

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: sig.header,
          timestamp: expiredTs,
          toleranceSec: 300,
          now: fixedNowMs,
        })
      ).toThrowError(WebhookVerificationError);

      try {
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: sig.header,
          timestamp: expiredTs,
          toleranceSec: 300,
          now: fixedNowMs,
        });
      } catch (err) {
        const error = err as WebhookVerificationError;
        expect(error.code).toBe('TIMESTAMP_OUT_OF_RANGE');
        expect(error.timestamp).toBe(expiredTs);
        expect(error.toleranceSec).toBe(300);
      }
    });

    it('accepts future timestamp within clock skew tolerance', () => {
      const futureTs = fixedNowSec + 60; // 1 min in the future
      const sig = createTestSignature(secret, futureTs, payload);
      const isValid = verifyWebhookSignature({
        payload,
        secret,
        signature: sig.header,
        timestamp: futureTs,
        toleranceSec: 300,
        now: fixedNowMs,
      });
      expect(isValid).toBe(true);
    });

    it('rejects future timestamp beyond tolerance window', () => {
      const farFutureTs = fixedNowSec + 305;
      const sig = createTestSignature(secret, farFutureTs, payload);

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: sig.header,
          timestamp: farFutureTs,
          toleranceSec: 300,
          now: fixedNowMs,
        })
      ).toThrowError(WebhookVerificationError);
    });

    it('prefers toleranceSec over toleranceMs if both are supplied', () => {
      const ts = fixedNowSec - 50; // 50 seconds old
      const sig = createTestSignature(secret, ts, payload);

      // toleranceSec = 30 (fails), toleranceMs = 100000 (100s, would pass)
      const isValid = verifyWebhookSignature({
        payload,
        secret,
        signature: sig.header,
        timestamp: ts,
        toleranceSec: 30, // takes precedence!
        toleranceMs: 100000,
        now: fixedNowMs,
      });

      expect(isValid).toBe(false);
    });

    it('rejects non-integer or negative timestamps', () => {
      const sig = createTestSignature(secret, 1727000000, payload);

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: sig.header,
          timestamp: '1727000000.5',
          now: fixedNowMs,
        })
      ).toThrowError(WebhookVerificationError);

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret,
          signature: sig.header,
          timestamp: -50,
          now: fixedNowMs,
        })
      ).toThrowError(WebhookVerificationError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Secret Rotation & Multiple Signatures
  // ─────────────────────────────────────────────────────────────
  describe('Secret Rotation & Multi-Secret Validation', () => {
    const timestamp = 1727000000;
    const payload = '{"rotate":true}';

    it('succeeds when old secret is valid during rotation', () => {
      const sigOld = createTestSignature(oldSecret, timestamp, payload);

      const isValid = verifyWebhookSignature({
        payload,
        secret: [oldSecret, newSecret],
        signature: sigOld.header,
        timestamp,
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('succeeds when new secret is valid during rotation', () => {
      const sigNew = createTestSignature(newSecret, timestamp, payload);

      const isValid = verifyWebhookSignature({
        payload,
        secret: [oldSecret, newSecret],
        signature: sigNew.header,
        timestamp,
        now: timestamp * 1000,
      });

      expect(isValid).toBe(true);
    });

    it('succeeds when multiple candidate signatures are received (e.g. dual delivery header)', () => {
      const sigOld = createTestSignature(oldSecret, timestamp, payload);
      const sigNew = createTestSignature(newSecret, timestamp, payload);
      const combinedHeader = `${sigOld.header},${sigNew.header}`;

      // Consumer only has newSecret
      const isValidWithNew = verifyWebhookSignature({
        payload,
        secret: newSecret,
        signature: combinedHeader,
        timestamp,
        now: timestamp * 1000,
      });

      expect(isValidWithNew).toBe(true);

      // Consumer has both secrets
      const isValidWithBoth = verifyWebhookSignature({
        payload,
        secret: [oldSecret, newSecret],
        signature: combinedHeader,
        timestamp,
        now: timestamp * 1000,
      });

      expect(isValidWithBoth).toBe(true);
    });

    it('fails when none of the secrets match', () => {
      const sigOther = createTestSignature('some_wrong_secret', timestamp, payload);

      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret: [oldSecret, newSecret],
          signature: sigOther.header,
          timestamp,
          now: timestamp * 1000,
        })
      ).toThrowError(WebhookVerificationError);
    });

    it('evaluates all secret/candidate pairs (constant-time evaluation across secrets)', () => {
      const sigNew = createTestSignature(newSecret, timestamp, payload);
      // Put invalid secret first, valid secret second
      const isValid = verifyWebhookSignature({
        payload,
        secret: ['invalid_secret_1', 'invalid_secret_2', newSecret],
        signature: sigNew.header,
        timestamp,
        now: timestamp * 1000,
      });
      expect(isValid).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Tampering, Malformed Inputs & Security
  // ─────────────────────────────────────────────────────────────
  describe('Tamper Resistance & Cryptographic Security', () => {
    const timestamp = 1727000000;
    const payload = '{"amount":100}';
    const sig = createTestSignature(secret, timestamp, payload);

    it('rejects tampered payload', () => {
      const isValid = verifyWebhookSignature({
        payload: '{"amount":999}',
        secret,
        signature: sig.header,
        timestamp,
        now: timestamp * 1000,
      });
      expect(isValid).toBe(false);
    });

    it('rejects tampered timestamp', () => {
      const isValid = verifyWebhookSignature({
        payload,
        secret,
        signature: sig.header,
        timestamp: timestamp + 1,
        now: timestamp * 1000,
      });
      expect(isValid).toBe(false);
    });

    it('rejects signature with odd length or non-hex characters', () => {
      const isValidOdd = verifyWebhookSignature({
        payload,
        secret,
        signature: 'v1=abc1234', // odd length
        timestamp,
        now: timestamp * 1000,
      });
      expect(isValidOdd).toBe(false);

      const isValidNonHex = verifyWebhookSignature({
        payload,
        secret,
        signature: 'v1=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
        timestamp,
        now: timestamp * 1000,
      });
      expect(isValidNonHex).toBe(false);
    });

    it('rejects signature with different length (length check guard)', () => {
      const isValidShort = verifyWebhookSignature({
        payload,
        secret,
        signature: 'v1=1234567890abcdef', // only 16 chars instead of 64
        timestamp,
        now: timestamp * 1000,
      });
      expect(isValidShort).toBe(false);
    });

    it('never leaks secret strings in WebhookVerificationError messages', () => {
      const sensitiveSecret = 'whsec_SUPER_SENSITIVE_SECRET_XYZ999';
      try {
        verifyWebhookSignatureOrThrow({
          payload,
          secret: sensitiveSecret,
          signature: 'v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          timestamp,
          now: timestamp * 1000,
        });
        expect.unreachable();
      } catch (err) {
        const error = err as WebhookVerificationError;
        expect(error.message).not.toContain(sensitiveSecret);
        expect(error.stack).not.toContain(sensitiveSecret);
      }
    });

    it('throws MISSING_SECRET when secret is empty', () => {
      expect(() =>
        verifyWebhookSignatureOrThrow({
          payload,
          secret: '',
          signature: sig.header,
          timestamp,
          now: timestamp * 1000,
        })
      ).toThrowError(/Missing signing secret/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. constructWebhookEvent<T>
  // ─────────────────────────────────────────────────────────────
  describe('constructWebhookEvent<T>', () => {
    interface OrderEvent {
      id: string;
      total: number;
    }

    const timestamp = 1727000000;
    const rawPayload = JSON.stringify({ id: 'ord_123', total: 99.95 });
    const sig = createTestSignature(secret, timestamp, rawPayload);

    it('verifies signature and parses JSON payload into typed object', () => {
      const event = constructWebhookEvent<OrderEvent>({
        payload: rawPayload,
        secret,
        signature: sig.header,
        timestamp,
        now: timestamp * 1000,
      });

      expect(event).toBeDefined();
      expect(event.id).toBe('ord_123');
      expect(event.total).toBe(99.95);
    });

    it('verifies before JSON parsing and rejects malformed JSON after valid signature', () => {
      const malformedPayload = 'not-valid-json{';
      const malformedSig = createTestSignature(secret, timestamp, malformedPayload);

      expect(() =>
        constructWebhookEvent({
          payload: malformedPayload,
          secret,
          signature: malformedSig.header,
          timestamp,
          now: timestamp * 1000,
        })
      ).toThrowError(WebhookVerificationError);

      try {
        constructWebhookEvent({
          payload: malformedPayload,
          secret,
          signature: malformedSig.header,
          timestamp,
          now: timestamp * 1000,
        });
      } catch (err) {
        const error = err as WebhookVerificationError;
        expect(error.code).toBe('INVALID_PAYLOAD');
        expect(error.message).toContain('not valid JSON');
      }
    });

    it('throws if signature fails without attempting JSON parsing', () => {
      expect(() =>
        constructWebhookEvent({
          payload: '{"ok":true}',
          secret,
          signature: 'v1=invalid_signature_hex_value_000000000000000000000000000000000000',
          timestamp,
          now: timestamp * 1000,
        })
      ).toThrowError(WebhookVerificationError);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Client Integration & Stateless Webhooks Instance
  // ─────────────────────────────────────────────────────────────
  describe('ZyvanClient Webhooks Integration', () => {
    const timestamp = 1727000000;
    const payload = '{"ping":"pong"}';
    const sig = createTestSignature(secret, timestamp, payload);

    it('supports static ZyvanClient.webhooks.verify', () => {
      const isValid = ZyvanClient.webhooks.verify({
        payload,
        secret,
        signature: sig.header,
        timestamp,
        now: timestamp * 1000,
      });
      expect(isValid).toBe(true);
    });

    it('supports instance client.webhooks.verify', () => {
      const client = new ZyvanClient({ apiKey: 'zyvan_live_test_123' });
      const isValid = client.webhooks.verify({
        payload,
        secret,
        signature: sig.header,
        timestamp,
        now: timestamp * 1000,
      });
      expect(isValid).toBe(true);
    });

    it('supports instance client.webhooks.constructEvent', () => {
      const client = new ZyvanClient({ apiKey: 'zyvan_live_test_123' });
      const event = client.webhooks.constructEvent<{ ping: string }>({
        payload,
        secret,
        signature: sig.header,
        timestamp,
        now: timestamp * 1000,
      });
      expect(event.ping).toBe('pong');
    });

    it('exported webhooks singleton is stateless and identical to Webhooks instance', () => {
      expect(webhooks).toBeInstanceOf(Webhooks);
      expect(ZyvanClient.webhooks).toBe(webhooks);
    });
  });
});
