// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Webhook Signature Verification Engine
// Zero-dependency, timing-safe HMAC-SHA256 signature verification.
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { ZyvanError } from './errors';

export type WebhookVerificationErrorCode =
  | 'MISSING_SECRET'
  | 'MISSING_SIGNATURE'
  | 'MISSING_TIMESTAMP'
  | 'INVALID_HEADER_FORMAT'
  | 'TIMESTAMP_OUT_OF_RANGE'
  | 'SIGNATURE_MISMATCH'
  | 'INVALID_PAYLOAD';

export interface WebhookVerificationErrorOptions {
  code: WebhookVerificationErrorCode;
  timestamp?: number;
  toleranceSec?: number;
  cause?: unknown;
}

/**
 * WebhookVerificationError is thrown when signature verification fails.
 */
export class WebhookVerificationError extends ZyvanError {
  public readonly code: WebhookVerificationErrorCode;
  public readonly timestamp?: number;
  public readonly toleranceSec?: number;

  constructor(message: string, options: WebhookVerificationErrorOptions) {
    super(message, {
      code: options.code,
      statusCode: 400,
      cause: options.cause instanceof Error ? options.cause : undefined,
    });
    this.name = 'WebhookVerificationError';
    this.code = options.code;
    this.timestamp = options.timestamp;
    this.toleranceSec = options.toleranceSec;
    Object.setPrototypeOf(this, WebhookVerificationError.prototype);
  }
}

export type WebhookHeaderBag =
  | Record<string, string | string[] | undefined>
  | { get(name: string): string | null };

export interface WebhookVerifyOptions {
  /**
   * The raw request payload (unparsed body string or Buffer).
   * Note: The exact raw bytes must be provided. Do not use re-serialized JSON.
   */
  payload: string | Buffer;

  /**
   * The signing secret or an array of secrets (for zero-downtime secret rotation).
   */
  secret: string | string[];

  /**
   * Optional incoming HTTP headers object (e.g. req.headers, fetch Headers, or Record).
   */
  headers?: WebhookHeaderBag;

  /**
   * The signature header value or list of candidate signatures.
   * If omitted, extracted from headers ('x-zyvan-signature' or 'zyvan-signature').
   */
  signature?: string | string[];

  /**
   * The timestamp in Unix epoch seconds.
   * If omitted, extracted from headers ('x-zyvan-timestamp' or embedded in signature 't=...').
   */
  timestamp?: string | number;

  /**
   * Freshness replay-window tolerance in seconds (default: 300 = 5 minutes).
   * Verifies that |now - timestamp| <= toleranceSec.
   */
  toleranceSec?: number;

  /**
   * Backward-compatible alias for tolerance in milliseconds.
   * If toleranceSec is also set, toleranceSec takes precedence.
   */
  toleranceMs?: number;

  /**
   * Override current time for deterministic testing (Date object or epoch seconds/milliseconds).
   */
  now?: number | Date;
}

export interface WebhookConstructEventOptions<T = Record<string, unknown>>
  extends WebhookVerifyOptions {}

interface ParsedHeaderData {
  timestamp?: number;
  signatures: string[];
}

/**
 * Extract a header value from a WebhookHeaderBag in a case-insensitive manner.
 */
function getHeaderValues(headers: WebhookHeaderBag, headerName: string): string[] {
  const targetLower = headerName.toLowerCase();

  if (typeof (headers as { get?: unknown }).get === 'function') {
    const val = (headers as { get(name: string): string | null }).get(headerName);
    return val !== null ? [val] : [];
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const results: string[] = [];

  for (const [key, val] of Object.entries(record)) {
    if (key.toLowerCase() === targetLower && val !== undefined) {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item !== undefined) results.push(item);
        }
      } else {
        results.push(val);
      }
    }
  }

  return results;
}

/**
 * Parse and validate headers and explicit options.
 */
function extractSignatureAndTimestamp(options: WebhookVerifyOptions): {
  timestamp: number;
  signatures: string[];
} {
  let rawSigEntries: string[] = [];
  let separateTsStr: string | undefined;

  // 1. Ingest from options.headers if present
  if (options.headers) {
    const xZyvanSig = getHeaderValues(options.headers, 'x-zyvan-signature');
    const zyvanSig = getHeaderValues(options.headers, 'zyvan-signature');

    // Conflicting signature header aliases check
    if (xZyvanSig.length > 0 && zyvanSig.length > 0) {
      const setA = new Set(xZyvanSig);
      const setB = new Set(zyvanSig);
      if (setA.size !== setB.size || [...setA].some((s) => !setB.has(s))) {
        throw new WebhookVerificationError(
          'Conflicting signature header values in x-zyvan-signature and zyvan-signature',
          { code: 'INVALID_HEADER_FORMAT' }
        );
      }
    }

    const headerSigs = xZyvanSig.length > 0 ? xZyvanSig : zyvanSig;
    rawSigEntries.push(...headerSigs);

    const xZyvanTs = getHeaderValues(options.headers, 'x-zyvan-timestamp');
    const zyvanTs = getHeaderValues(options.headers, 'zyvan-timestamp');

    // Conflicting timestamp header aliases check
    if (xZyvanTs.length > 0 && zyvanTs.length > 0) {
      const setA = new Set(xZyvanTs);
      const setB = new Set(zyvanTs);
      if (setA.size !== setB.size || [...setA].some((t) => !setB.has(t))) {
        throw new WebhookVerificationError(
          'Conflicting timestamp header values in x-zyvan-timestamp and zyvan-timestamp',
          { code: 'INVALID_HEADER_FORMAT' }
        );
      }
    }

    const headerTs = xZyvanTs.length > 0 ? xZyvanTs : zyvanTs;
    if (headerTs.length > 1) {
      // Ensure all values are identical
      const first = headerTs[0];
      if (headerTs.some((t) => t !== first)) {
        throw new WebhookVerificationError('Multiple conflicting timestamp headers received', {
          code: 'INVALID_HEADER_FORMAT',
        });
      }
      separateTsStr = first;
    } else if (headerTs.length === 1) {
      separateTsStr = headerTs[0];
    }
  }

  // 2. Explicit options override/add
  if (options.signature !== undefined) {
    if (Array.isArray(options.signature)) {
      rawSigEntries.push(...options.signature);
    } else {
      rawSigEntries.push(options.signature);
    }
  }

  if (options.timestamp !== undefined) {
    const explicitTs = String(options.timestamp);
    if (separateTsStr !== undefined && separateTsStr !== explicitTs) {
      throw new WebhookVerificationError(
        'Conflicting timestamp provided between options.timestamp and headers',
        { code: 'INVALID_HEADER_FORMAT' }
      );
    }
    separateTsStr = explicitTs;
  }

  if (rawSigEntries.length === 0) {
    throw new WebhookVerificationError('Missing webhook signature', {
      code: 'MISSING_SIGNATURE',
    });
  }

  // 3. Parse signature entries (supports comma-separated elements, "t=...,v1=..." or "v1=...")
  let embeddedTs: number | undefined;
  const candidateSignatures: string[] = [];
  let foundAnyVersionTag = false;

  for (const entry of rawSigEntries) {
    if (typeof entry !== 'string' || entry.trim() === '') continue;

    // Split on comma for combined header formats (e.g. "t=123,v1=abc,v1=def")
    const parts = entry.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) {
        // Raw signature without version prefix - invalid format
        continue;
      }

      const prefix = part.substring(0, eqIdx).trim();
      const val = part.substring(eqIdx + 1).trim();

      if (prefix === 't') {
        const parsedT = Number(val);
        if (!Number.isInteger(parsedT) || parsedT < 0) {
          throw new WebhookVerificationError(
            `Malformed timestamp in signature header: "${val}"`,
            { code: 'INVALID_HEADER_FORMAT' }
          );
        }
        if (embeddedTs !== undefined && embeddedTs !== parsedT) {
          throw new WebhookVerificationError(
            'Conflicting embedded timestamps found in signature header',
            { code: 'INVALID_HEADER_FORMAT' }
          );
        }
        embeddedTs = parsedT;
      } else if (prefix === 'v1') {
        foundAnyVersionTag = true;
        if (val) {
          candidateSignatures.push(val.toLowerCase());
        }
      } else if (prefix.startsWith('v')) {
        // Other version tag (e.g. v0, v2)
        foundAnyVersionTag = true;
      }
    }
  }

  // 4. Resolve timestamp
  let finalTimestamp: number;
  if (separateTsStr !== undefined) {
    const parsedSep = Number(separateTsStr);
    if (!Number.isInteger(parsedSep) || parsedSep < 0) {
      throw new WebhookVerificationError(
        `Invalid timestamp format: "${separateTsStr}". Must be positive integer seconds.`,
        { code: 'INVALID_HEADER_FORMAT' }
      );
    }
    if (embeddedTs !== undefined && embeddedTs !== parsedSep) {
      throw new WebhookVerificationError(
        `Conflicting timestamps: embedded t=${embeddedTs} does not match separate timestamp ${parsedSep}`,
        { code: 'INVALID_HEADER_FORMAT' }
      );
    }
    finalTimestamp = parsedSep;
  } else if (embeddedTs !== undefined) {
    finalTimestamp = embeddedTs;
  } else {
    throw new WebhookVerificationError('Missing webhook timestamp', {
      code: 'MISSING_TIMESTAMP',
    });
  }

  // 5. Check if any v1 signature was found
  if (candidateSignatures.length === 0) {
    if (foundAnyVersionTag) {
      throw new WebhookVerificationError(
        'No supported v1 signature found in signature header',
        { code: 'INVALID_HEADER_FORMAT' }
      );
    }
    throw new WebhookVerificationError('Missing or malformed v1 webhook signature', {
      code: 'MISSING_SIGNATURE',
    });
  }

  return {
    timestamp: finalTimestamp,
    signatures: candidateSignatures,
  };
}

/**
 * Normalize and validate options.secret.
 */
function normalizeSecrets(secret: string | string[]): string[] {
  const list = Array.isArray(secret) ? secret : [secret];
  const valid = list.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);

  if (valid.length === 0) {
    throw new WebhookVerificationError(
      'Missing signing secret. A non-empty secret or secret array is required.',
      { code: 'MISSING_SECRET' }
    );
  }

  return valid;
}

/**
 * Normalize current time in milliseconds.
 */
function resolveNowMs(now?: number | Date): number {
  if (now instanceof Date) {
    return now.getTime();
  }
  if (typeof now === 'number') {
    if (!Number.isFinite(now) || now < 0) {
      throw new TypeError('options.now must be a valid, finite positive number or Date');
    }
    // If epoch seconds (<= 1e11), convert to milliseconds
    return now <= 1e11 ? Math.floor(now * 1000) : Math.floor(now);
  }
  return Date.now();
}

/**
 * Resolve tolerance in seconds with strict validation.
 */
function resolveToleranceSec(options: WebhookVerifyOptions): number {
  if (options.toleranceSec !== undefined) {
    if (!Number.isFinite(options.toleranceSec) || options.toleranceSec < 0) {
      throw new TypeError('options.toleranceSec must be a non-negative finite number');
    }
    return Math.floor(options.toleranceSec);
  }

  if (options.toleranceMs !== undefined) {
    if (!Number.isFinite(options.toleranceMs) || options.toleranceMs < 0) {
      throw new TypeError('options.toleranceMs must be a non-negative finite number');
    }
    return Math.floor(options.toleranceMs / 1000);
  }

  return 300; // default 5 minutes
}

/**
 * Verify a webhook signature, throwing WebhookVerificationError with diagnostic code if verification fails.
 */
export function verifyWebhookSignatureOrThrow(options: WebhookVerifyOptions): void {
  if (!options) {
    throw new WebhookVerificationError('Missing options for webhook verification', {
      code: 'INVALID_PAYLOAD',
    });
  }

  // 1. Normalize secrets
  const secrets = normalizeSecrets(options.secret);

  // 2. Validate payload
  if (options.payload === undefined || options.payload === null) {
    throw new WebhookVerificationError('Missing webhook payload', {
      code: 'INVALID_PAYLOAD',
    });
  }

  let rawBytes: Buffer;
  if (Buffer.isBuffer(options.payload)) {
    rawBytes = options.payload;
  } else if (typeof options.payload === 'string') {
    rawBytes = Buffer.from(options.payload, 'utf8');
  } else {
    throw new WebhookVerificationError(
      'Invalid payload type: payload must be a raw utf-8 string or Buffer',
      { code: 'INVALID_PAYLOAD' }
    );
  }

  // 3. Extract signature and timestamp
  const { timestamp, signatures } = extractSignatureAndTimestamp(options);

  // 4. Validate timestamp freshness window (anti-replay window & clock skew)
  const toleranceSec = resolveToleranceSec(options);
  const nowMs = resolveNowMs(options.now);
  const tsMs = timestamp * 1000;
  const diffMs = Math.abs(nowMs - tsMs);

  if (diffMs > toleranceSec * 1000) {
    throw new WebhookVerificationError(
      `Webhook timestamp ${timestamp} is outside the allowed tolerance window of ${toleranceSec}s`,
      {
        code: 'TIMESTAMP_OUT_OF_RANGE',
        timestamp,
        toleranceSec,
      }
    );
  }

  // 5. Construct canonical signed bytes: Buffer(`${timestamp}.`) + rawBytes
  const prefixBuf = Buffer.from(`${timestamp}.`, 'utf8');
  const signedBuffer = Buffer.concat([prefixBuf, rawBytes]);

  // 6. Evaluate all candidate signatures against all secrets in constant time.
  // Evaluate all pairs to prevent timing differences between secrets.
  let matched = false;

  for (const sec of secrets) {
    const expectedHex = crypto
      .createHmac('sha256', sec)
      .update(signedBuffer)
      .digest('hex')
      .toLowerCase();

    const expectedBuf = Buffer.from(expectedHex, 'hex');

    for (const candHex of signatures) {
      // HMAC-SHA256 hex is exactly 64 hex characters (32 bytes)
      if (candHex.length !== 64 || !/^[0-9a-f]{64}$/.test(candHex)) {
        continue;
      }

      const candBuf = Buffer.from(candHex, 'hex');
      if (candBuf.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, candBuf)) {
        matched = true;
      }
    }
  }

  if (!matched) {
    throw new WebhookVerificationError(
      'Webhook signature does not match expected HMAC-SHA256 signature',
      {
        code: 'SIGNATURE_MISMATCH',
        timestamp,
        toleranceSec,
      }
    );
  }
}

/**
 * Verify a webhook signature, returning true if valid, or false if verification fails.
 * Never throws WebhookVerificationError.
 */
export function verifyWebhookSignature(options: WebhookVerifyOptions): boolean {
  try {
    verifyWebhookSignatureOrThrow(options);
    return true;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return false;
    }
    // Re-throw unexpected program errors (e.g. invalid arguments or non-verification errors)
    throw err;
  }
}

/**
 * Verify a webhook signature and parse its JSON payload into a typed event.
 *
 * NOTE: `T` is a compile-time type assertion; the SDK does not perform runtime schema validation.
 *
 * @throws WebhookVerificationError if signature verification fails or if the payload is not valid JSON.
 */
export function constructWebhookEvent<T = Record<string, unknown>>(
  options: WebhookConstructEventOptions<T>
): T {
  // 1. Verify exact raw bytes BEFORE JSON parsing
  verifyWebhookSignatureOrThrow(options);

  // 2. Parse JSON payload
  const rawStr = Buffer.isBuffer(options.payload)
    ? options.payload.toString('utf8')
    : options.payload;

  try {
    return JSON.parse(rawStr) as T;
  } catch (err) {
    throw new WebhookVerificationError('Webhook payload is not valid JSON', {
      code: 'INVALID_PAYLOAD',
      cause: err,
    });
  }
}

/**
 * Webhooks engine instance providing verification and event construction helpers.
 */
export class Webhooks {
  /**
   * Verify a webhook signature, returning true if valid or false if invalid.
   */
  public verify(options: WebhookVerifyOptions): boolean {
    return verifyWebhookSignature(options);
  }

  /**
   * Verify a webhook signature, throwing WebhookVerificationError with diagnostic code if verification fails.
   */
  public verifyOrThrow(options: WebhookVerifyOptions): void {
    verifyWebhookSignatureOrThrow(options);
  }

  /**
   * Verify a webhook signature and parse its JSON payload into a typed event.
   *
   * NOTE: `T` is a compile-time type assertion; the SDK does not perform runtime schema validation.
   */
  public constructEvent<T = Record<string, unknown>>(
    options: WebhookConstructEventOptions<T>
  ): T {
    return constructWebhookEvent<T>(options);
  }
}

export const webhooks = new Webhooks();
