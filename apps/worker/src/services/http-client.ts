// ─────────────────────────────────────────────────────────────
// Zyvan Worker — HTTP Delivery Client
//
// Sends the actual webhook HTTP request to the customer's
// destination. Handles HMAC signing, timeouts, and response
// capture.
//
// Headers sent:
//   X-Zyvan-Signature: v1=<hex_hmac>
//   X-Zyvan-Timestamp: <unix_epoch>
//   X-Zyvan-Delivery-Id: <delivery_id>
//   X-Zyvan-Event-Id: <event_id>
//   Content-Type: application/json
//   User-Agent: Zyvan/0.1.0
// ─────────────────────────────────────────────────────────────

import { signPayload } from '@zyvan/crypto';
import { decrypt } from '@zyvan/crypto';

export interface WebhookRequest {
  url: string;
  payload: string; // JSON string
  deliveryId: string;
  eventId: string;
  encryptedSecret: string | null;
  encryptionKey: string;
  hmacVersion: string;
  timeoutMs: number;
}

export interface WebhookResult {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  responseBody: string | null;
  error: string | null;
  outcome: 'success' | 'failed' | 'timeout' | 'error';
}

/**
 * Send a signed webhook to a destination.
 *
 * 1. Decrypt the signing secret (if configured)
 * 2. Generate HMAC-SHA256 signature
 * 3. Send POST with all Zyvan headers
 * 4. Capture response and timing
 */
export async function sendWebhook(req: WebhookRequest): Promise<WebhookResult> {
  const startTime = Date.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Zyvan/0.1.0',
    'X-Zyvan-Delivery-Id': req.deliveryId,
    'X-Zyvan-Event-Id': req.eventId,
  };

  // Sign the payload if a secret is configured
  if (req.encryptedSecret) {
    try {
      const secret = decrypt(req.encryptedSecret, req.encryptionKey);
      const sig = signPayload(secret, req.payload, req.hmacVersion);
      headers['X-Zyvan-Signature'] = sig.header;
      headers['X-Zyvan-Timestamp'] = String(sig.timestamp);
    } catch (err) {
      // If decryption fails, still send — but without signature
      // This prevents a broken secret from blocking all deliveries
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs);

    const response = await fetch(req.url, {
      method: 'POST',
      headers,
      body: req.payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    // Capture truncated response body (max 4KB for storage)
    let responseBody: string | null = null;
    try {
      const text = await response.text();
      responseBody = text.substring(0, 4096);
    } catch {
      // Ignore response body read errors
    }

    const success = response.status >= 200 && response.status < 300;

    return {
      success,
      statusCode: response.status,
      latencyMs,
      responseBody,
      error: success ? null : `HTTP ${response.status}`,
      outcome: success ? 'success' : 'failed',
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;

    if (err.name === 'AbortError') {
      return {
        success: false,
        statusCode: null,
        latencyMs,
        responseBody: null,
        error: `Connection timed out (${req.timeoutMs}ms)`,
        outcome: 'timeout',
      };
    }

    return {
      success: false,
      statusCode: null,
      latencyMs,
      responseBody: null,
      error: err.message || 'Network error',
      outcome: 'error',
    };
  }
}
