// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Official Client
// ─────────────────────────────────────────────────────────────

import crypto from 'crypto';
import type { ZyvanClientOptions, RequestOptions, ApiResponse } from './types';
import { HttpTransport } from './transport';

// Legacy compatibility types retained until PR 4.2 / PR 4.4
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
  toleranceMs?: number;
}

export class ZyvanClient {
  private readonly transport: HttpTransport;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly projectId?: string;
  private readonly timeoutMs: number;

  constructor(options: ZyvanClientOptions) {
    if (!options?.apiKey || typeof options.apiKey !== 'string' || options.apiKey.trim() === '') {
      throw new Error('ZyvanClient requires a non-empty apiKey');
    }

    this.transport = new HttpTransport(options);
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl || 'https://api.zyvan.dev').replace(/\/$/, '');
    this.projectId = options.projectId?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  /**
   * Execute an arbitrary HTTP request via the SDK's transport layer.
   */
  public async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    return this.transport.request<T>(options);
  }

  /**
   * HTTP GET convenience method.
   */
  public async get<T>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'GET' });
  }

  /**
   * HTTP POST convenience method.
   */
  public async post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'POST', body });
  }

  /**
   * HTTP PUT convenience method.
   */
  public async put<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'PUT', body });
  }

  /**
   * HTTP PATCH convenience method.
   */
  public async patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'PATCH', body });
  }

  /**
   * HTTP DELETE convenience method.
   */
  public async delete<T>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'DELETE' });
  }

  // ─── Legacy / Compatibility Surface (Migrated in PR 4.2 & PR 4.4) ─────

  public events = {
    send: async (input: SendEventInput): Promise<IngestResponse> => {
      const idempotencyKey =
        input.idempotencyKey || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const response = await this.post<IngestResponse>(
        '/v1/events',
        {
          eventType: input.type,
          idempotencyKey,
          data: input.payload,
        },
        {
          idempotencyKey,
          headers: input.headers,
        }
      );

      return response.data;
    },
  };

  /**
   * Zero-dependency Webhook Signature Verification (retained untouched for PR 4.1).
   */
  public static webhooks = {
    verify(options: WebhookVerifyOptions): boolean {
      const { payload, signature, timestamp, secret, toleranceMs = 300000 } = options;

      if (!signature || !timestamp || !secret) {
        return false;
      }

      const tsNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
      const nowSec = Math.floor(Date.now() / 1000);
      const toleranceSec = Math.floor(toleranceMs / 1000);

      if (Math.abs(nowSec - tsNum) > toleranceSec) {
        return false;
      }

      const payloadStr = Buffer.isBuffer(payload) ? payload.toString('utf-8') : payload;
      const signedContent = `${tsNum}.${payloadStr}`;
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(signedContent, 'utf-8')
        .digest('hex');

      let candidate = signature.trim();
      if (candidate.startsWith('v1=')) {
        candidate = candidate.substring(3);
      }

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
