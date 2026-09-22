// ─────────────────────────────────────────────────────────────
// Zyvan Worker — SSRF-Safe HTTP Delivery Client
//
// Sends the webhook HTTP request to the customer's destination.
//
// Hardened Protections:
//   1. Pre-flight URL & DNS validation via ssrf-validator.ts
//   2. Socket-level IP Pinning (custom lookup) to prevent DNS rebinding
//   3. Manual redirect following with re-validation on every hop (max 3)
//   4. Stream limit: strictly caps incoming response to 4KB (4096 bytes)
//   5. Strict 15s timeout with abort
//   6. HMAC-SHA256 signature calculation
// ─────────────────────────────────────────────────────────────

import http from 'http';
import https from 'https';
import { signPayload, decrypt } from '@zyvan/crypto';
import { validateDestinationUrl } from './ssrf-validator';

export interface WebhookRequest {
  url: string;
  payload: string; // JSON string
  deliveryId: string;
  eventId: string;
  encryptedSecret: string | null;
  encryptionKey: string;
  hmacVersion: string;
  timeoutMs?: number;
}

export interface WebhookResult {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  responseBody: string | null;
  error: string | null;
  outcome: 'success' | 'failed' | 'timeout' | 'error';
}

const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 4096; // 4KB stream limit
const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds

/**
 * Execute a single HTTP/HTTPS request with IP pinning, timeout, and response stream truncation.
 */
function executeRequest(
  urlStr: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
  timeoutMs: number
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  responseBody: string;
}> {
  return new Promise(async (resolve, reject) => {
    let validated;
    try {
      validated = await validateDestinationUrl(urlStr);
    } catch (err) {
      return reject(err);
    }

    const { resolvedIp, isIpv6, parsedUrl } = validated;
    const isHttps = parsedUrl.protocol === 'https:';
    const requestFn = isHttps ? https.request : http.request;

    // Custom DNS lookup to pin connection directly to validated IP (immune to DNS rebinding)
    const lookupFn: http.RequestOptions['lookup'] = (_hostname, _options, callback) => {
      callback(null, resolvedIp, isIpv6 ? 6 : 4);
    };

    const options: http.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        ...headers,
        Host: parsedUrl.host,
      },
      lookup: lookupFn,
      timeout: timeoutMs,
    };

    // For HTTPS, preserve SNI servername matching hostname
    if (isHttps) {
      (options as https.RequestOptions).servername = parsedUrl.hostname;
    }

    let settled = false;
    const req = requestFn(options, (res) => {
      let receivedBytes = 0;
      let chunks: Buffer[] = [];
      let isTruncated = false;

      res.on('data', (chunk: Buffer) => {
        if (receivedBytes + chunk.length > MAX_RESPONSE_BYTES) {
          const remaining = MAX_RESPONSE_BYTES - receivedBytes;
          if (remaining > 0) {
            chunks.push(chunk.subarray(0, remaining));
            receivedBytes += remaining;
          }
          isTruncated = true;
          // Abort stream to prevent memory exhaustion DoS
          res.destroy();
        } else {
          chunks.push(chunk);
          receivedBytes += chunk.length;
        }
      });

      res.on('end', () => {
        if (settled) return;
        settled = true;
        const responseBody = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          responseBody: isTruncated ? `${responseBody} [TRUNCATED > 4KB]` : responseBody,
        });
      });

      res.on('close', () => {
        if (!settled) {
          settled = true;
          const responseBody = Buffer.concat(chunks).toString('utf8');
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            responseBody,
          });
        }
      });

      res.on('error', (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      });
    });

    req.on('timeout', () => {
      if (settled) return;
      settled = true;
      req.destroy(new Error(`Connection timed out (${timeoutMs}ms)`));
    });

    req.on('error', (err: any) => {
      if (settled) return;
      settled = true;
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * Send a signed webhook to a destination with SSRF protection, IP pinning,
 * and safe redirect validation.
 */
export async function sendWebhook(req: WebhookRequest): Promise<WebhookResult> {
  const startTime = Date.now();
  const timeoutMs = req.timeoutMs || DEFAULT_TIMEOUT_MS;

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
    } catch {
      // If decryption fails, continue without signature so delivery is not permanently stuck
    }
  }

  let currentUrl = req.url;
  let redirectCount = 0;

  try {
    while (true) {
      const elapsed = Date.now() - startTime;
      const remainingTimeout = Math.max(1000, timeoutMs - elapsed);

      const res = await executeRequest(
        currentUrl,
        'POST',
        headers,
        req.payload,
        remainingTimeout
      );

      // Check if redirect
      const isRedirect =
        [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location;

      if (isRedirect) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          throw new Error(`Too many redirects (exceeded limit of ${MAX_REDIRECTS})`);
        }

        const nextUrl = new URL(res.headers.location as string, currentUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      const latencyMs = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 300;

      return {
        success,
        statusCode: res.statusCode,
        latencyMs,
        responseBody: res.responseBody,
        error: success ? null : `HTTP ${res.statusCode}`,
        outcome: success ? 'success' : 'failed',
      };
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout =
      err.message?.includes('timed out') ||
      err.code === 'ETIMEDOUT' ||
      err.name === 'AbortError';

    const isSsrfBlock =
      err.message?.includes('SSRF Protection') ||
      err.message?.includes('Forbidden destination');

    return {
      success: false,
      statusCode: null,
      latencyMs,
      responseBody: null,
      error: err.message || 'Delivery error',
      outcome: isTimeout ? 'timeout' : isSsrfBlock ? 'failed' : 'error',
    };
  }
}
