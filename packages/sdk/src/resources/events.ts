// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Events Resource
// Exposes typed event ingestion, listing, and timeline inspection.
// ─────────────────────────────────────────────────────────────

import { Resource } from './base';
import type {
  SendEventInput,
  SendEventOptions,
  IngestResponse,
  EventFilterInput,
  PaginatedEventsResponse,
  EventDetail,
} from './types';

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class EventsResource extends Resource {
  /**
   * Ingest a webhook or domain event into Zyvan.
   *
   * Asynchronously dispatches deliveries to all matching destinations.
   * Uses an idempotency key (explicitly provided or automatically generated)
   * sent in both the 'Idempotency-Key' header and request body to guarantee
   * exactly-once processing.
   *
   * @param input Event payload, type, and optional headers/projectId
   * @param options Optional configuration including explicit idempotencyKey
   * @returns IngestResponse (202 Accepted, or 200 on duplicate idempotency key)
   * @throws {ValidationError} If required event attributes are invalid
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'events:write' scope
   */
  public async send(
    input: SendEventInput,
    options?: SendEventOptions
  ): Promise<IngestResponse> {
    if (!input || !input.type || typeof input.type !== 'string' || input.type.trim() === '') {
      throw new Error('Event type is required and must be a non-empty string');
    }

    const idempotencyKey =
      options?.idempotencyKey?.trim() ||
      input.idempotencyKey?.trim() ||
      generateIdempotencyKey();

    const body: Record<string, unknown> = {
      type: input.type.trim(),
      data: input.payload ?? {},
      idempotency_key: idempotencyKey,
      ...(input.headers ? { headers: input.headers } : {}),
      ...(input.projectId ? { projectId: input.projectId.trim() } : {}),
    };

    return this.httpPost<IngestResponse>('/v1/events', body, {
      idempotencyKey,
      projectId: input.projectId?.trim(),
    });
  }

  /**
   * List ingested events with optional filtering and cursor-based pagination.
   *
   * @param filters Query filters including eventType, status, time range, search, limit, and cursor
   * @returns PaginatedEventsResponse containing event summaries and pagination cursor
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'events:read' scope
   */
  public async list(filters?: EventFilterInput): Promise<PaginatedEventsResponse> {
    const query: Record<string, string | number | undefined> = {};
    if (filters) {
      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.status) query.status = filters.status;
      if (filters.from) query.from = filters.from;
      if (filters.to) query.to = filters.to;
      if (filters.search) query.search = filters.search;
      if (filters.cursor) query.cursor = filters.cursor;
      if (filters.limit !== undefined) query.limit = filters.limit;
    }

    return this.httpGet<PaginatedEventsResponse>('/v1/events', { query });
  }

  /**
   * Retrieve complete event details along with full delivery history and attempt timelines.
   *
   * @param id The event ID
   * @returns Complete EventDetail record
   * @throws {NotFoundError} If the event does not exist
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'events:read' scope
   */
  public async get(id: string): Promise<EventDetail> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Event ID is required and must be a non-empty string');
    }

    const res = await this.httpGet<{ data: EventDetail }>(`/v1/events/${encodeURIComponent(id.trim())}`);
    return res.data;
  }
}
