// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Resource Base Layer
// Typed abstract foundation for all public API resource namespaces.
// ─────────────────────────────────────────────────────────────

import type { HttpTransport } from '../transport';
import type { RequestOptions, ApiResponse } from '../types';

export abstract class Resource {
  protected constructor(protected readonly transport: HttpTransport) {}

  /**
   * Dispatches a raw request through the injected transport, returning
   * the full ApiResponse<T> envelope.
   */
  protected async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    return this.transport.request<T>(options);
  }

  /**
   * Dispatches a GET request and returns the parsed payload.
   */
  protected async get<T>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>
  ): Promise<T> {
    const res = await this.transport.request<T>({
      ...options,
      path,
      method: 'GET',
    });
    return res.data;
  }

  /**
   * Dispatches a POST request with an optional JSON body and returns the parsed payload.
   */
  protected async post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<T> {
    const res = await this.transport.request<T>({
      ...options,
      path,
      method: 'POST',
      body,
    });
    return res.data;
  }

  /**
   * Dispatches a PATCH request with an optional JSON body and returns the parsed payload.
   */
  protected async patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<T> {
    const res = await this.transport.request<T>({
      ...options,
      path,
      method: 'PATCH',
      body,
    });
    return res.data;
  }

  /**
   * Dispatches a DELETE request and returns the parsed payload (or void).
   */
  protected async delete<T = void>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>
  ): Promise<T> {
    const res = await this.transport.request<T>({
      ...options,
      path,
      method: 'DELETE',
    });
    return res.data;
  }
}
