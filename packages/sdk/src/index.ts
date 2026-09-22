// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Official TypeScript / Node.js Client
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';

export interface ZyvanClientOptions {
  apiKey: string;
  baseUrl?: string;
  projectId?: string;
  timeoutMs?: number;
}

export interface SendEventInput {
  type: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface IngestResponse {
  event_id: string;
  status: string;
  created_at: string;
  duplicate: boolean;
}

export interface WebhookVerifyOptions {
  payload: string | Buffer;
  signature: string;
  timestamp: string | number;
  secret: string;
  toleranceMs?: number; // Default 5 minutes
}

export class ZyvanClient {
  private apiKey: string;
  private baseUrl: string;
  private projectId?: string;
  private timeoutMs: number;

  constructor(options: ZyvanClientOptions) {
    if (!options.apiKey) {
      throw new Error('ZyvanClient requires an apiKey');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'https://api.zyvan.dev').replace(/\/$/, '');
    this.projectId = options.projectId;
    this.timeoutMs = options.timeoutMs || 10000;
  }

  public events = {
    send: async (input: SendEventInput): Promise<IngestResponse> => {
      const url = `${this.baseUrl}/v1/events`;
      const idempotencyKey =
        input.idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'Idempotency-Key': idempotencyKey,
            ...(this.projectId ? { 'X-Project-Id': this.projectId } : {}),
            ...(input.headers || {}),
          },
          body: JSON.stringify({
            eventType: input.type,
            idempotencyKey,
            data: input.payload,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Zyvan API error (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        return data as IngestResponse;
      } finally {
        clearTimeout(timer);
      }
    },
  };

  /**
   * Zero-dependency Webhook Signature Verification.
   * Compares HMAC-SHA256 signature in constant time with timestamp replay defense.
   */
  public static webhooks = {
    verify(options: WebhookVerifyOptions): boolean {
      const { payload, signature, timestamp, secret, toleranceMs = 300000 } = options;

      if (!signature || !timestamp || !secret) {
        return false;
      }

      // 1. Verify timestamp is within tolerance (prevents replay attacks)
      const tsNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
      const nowSec = Math.floor(Date.now() / 1000);
      const toleranceSec = Math.floor(toleranceMs / 1000);

      if (Math.abs(nowSec - tsNum) > toleranceSec) {
        return false;
      }

      // 2. Compute expected HMAC: HMAC-SHA256(secret, `${timestamp}.${payload}`)
      const payloadStr = Buffer.isBuffer(payload) ? payload.toString('utf-8') : payload;
      const signedContent = `${tsNum}.${payloadStr}`;
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(signedContent, 'utf-8')
        .digest('hex');

      // 3. Extract v1= signature from header
      let candidate = signature.trim();
      if (candidate.startsWith('v1=')) {
        candidate = candidate.substring(3);
      }

      // 4. Timing-safe comparison to prevent timing attacks
      try {
        const candidateBuf = Buffer.from(candidate, 'hex');
        const expectedBuf = Buffer.from(expectedHmac, 'hex');
        if (candidateBuf.length !== expectedBuf.length) {
          return false;
        }
        return crypto.timingSafeEqual(candidateBuf, expectedBuf);
      } catch {
        return false;
      }
    },
  };
}
