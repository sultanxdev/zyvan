// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Official Client
// Strongly typed API client with resource namespaces.
// ─────────────────────────────────────────────────────────────

import type { ZyvanClientOptions, RequestOptions, ApiResponse } from './types';
import { HttpTransport } from './transport';
import {
  ProjectsResource,
  EventsResource,
  DestinationsResource,
  DeliveriesResource,
  DeadLettersResource,
} from './resources';
import { Webhooks, webhooks } from './webhooks';
export type { WebhookVerifyOptions } from './webhooks';

export class ZyvanClient {
  private readonly transport: HttpTransport;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly projectId?: string;
  private readonly timeoutMs: number;

  /**
   * Projects resource: inspect organizations and projects accessible via API key.
   */
  public readonly projects: ProjectsResource;

  /**
   * Events resource: ingest webhook events and query event delivery history.
   */
  public readonly events: EventsResource;

  /**
   * Destinations resource: manage webhook destinations, rate limits, and retry policies.
   */
  public readonly destinations: DestinationsResource;

  /**
   * Deliveries resource: inspect destination delivery logs and attempts.
   */
  public readonly deliveries: DeliveriesResource;

  /**
   * DeadLetters resource: inspect, triage, replay, dismiss, or resolve DLQ failures.
   */
  public readonly deadLetters: DeadLettersResource;

  /**
   * Webhooks engine: verify incoming webhook signatures and construct typed events.
   */
  public readonly webhooks: Webhooks = webhooks;

  /**
   * Static Webhooks engine for verifying signatures without instantiating ZyvanClient.
   */
  public static readonly webhooks: Webhooks = webhooks;

  constructor(options: ZyvanClientOptions, testHooks?: import('./transport').HttpTransportTestHooks) {
    if (!options?.apiKey || typeof options.apiKey !== 'string' || options.apiKey.trim() === '') {
      throw new Error('ZyvanClient requires a non-empty apiKey');
    }

    this.transport = new HttpTransport(options, testHooks);
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl || 'https://api.zyvan.dev').replace(/\/$/, '');
    this.projectId = options.projectId?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? 10000;

    // Initialize typed resource clients
    this.projects = new ProjectsResource(this.transport);
    this.events = new EventsResource(this.transport);
    this.destinations = new DestinationsResource(this.transport);
    this.deliveries = new DeliveriesResource(this.transport);
    this.deadLetters = new DeadLettersResource(this.transport);
  }

  /**
   * Execute an arbitrary HTTP request via the SDK's transport layer.
   */
  public async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    return this.transport.request<T>(options);
  }

  /**
   * HTTP GET convenience method returning the ApiResponse<T> envelope.
   */
  public async get<T>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'GET' });
  }

  /**
   * HTTP POST convenience method returning the ApiResponse<T> envelope.
   */
  public async post<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'POST', body });
  }

  /**
   * HTTP PUT convenience method returning the ApiResponse<T> envelope.
   */
  public async put<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'PUT', body });
  }

  /**
   * HTTP PATCH convenience method returning the ApiResponse<T> envelope.
   */
  public async patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'path' | 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'PATCH', body });
  }

  /**
   * HTTP DELETE convenience method returning the ApiResponse<T> envelope.
   */
  public async delete<T>(
    path: string,
    options?: Omit<RequestOptions, 'path' | 'method'>
  ): Promise<ApiResponse<T>> {
    return this.transport.request<T>({ ...options, path, method: 'DELETE' });
  }
}
