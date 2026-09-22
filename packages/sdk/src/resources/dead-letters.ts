// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Dead Letters Resource (DLQ)
// Complete operational lifecycle management for dead-lettered webhook deliveries:
// inspection, aggregated triage summary, single/bulk replay, dismissal, and resolution.
// ─────────────────────────────────────────────────────────────

import { Resource } from './base';
import type {
  DLQFilterInput,
  DLQSummaryFilterInput,
  DLQSummaryResponse,
  DeadLetter,
  DeadLetterDetail,
  PaginatedDeadLettersResponse,
  ReplayDeadLetterOptions,
  ReplayResponse,
  ReplayBulkInput,
  ReplayBulkResponse,
  DismissDLQInput,
  DismissBulkDLQInput,
  ResolveDLQInput,
  ResolveBulkDLQInput,
  BulkMutationResponse,
} from './types';

export class DeadLettersResource extends Resource {
  /**
   * List dead-lettered webhook deliveries with filtering and cursor-based pagination.
   * By default, returns open items requiring triage.
   *
   * @param filters Optional filter criteria (status, destinationId, reason, time range, etc.)
   * @returns PaginatedDeadLettersResponse containing dead letters and pagination cursor
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:read' scope
   */
  public async list(filters?: DLQFilterInput): Promise<PaginatedDeadLettersResponse> {
    const query: Record<string, string | number | undefined> = {};
    if (filters) {
      if (filters.projectId) query.projectId = filters.projectId;
      if (filters.destinationId) query.destinationId = filters.destinationId;
      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.status) query.status = filters.status;
      if (filters.reason) query.reason = filters.reason;
      if (filters.search) query.search = filters.search;
      if (filters.from) query.from = filters.from;
      if (filters.to) query.to = filters.to;
      if (filters.cursor) query.cursor = filters.cursor;
      if (filters.limit !== undefined) query.limit = filters.limit;
    }

    return this.get<PaginatedDeadLettersResponse>('/v1/dead-letters', { query });
  }

  /**
   * Retrieve aggregated triage summary metrics across statuses, failure reasons, and top destinations.
   *
   * @param filters Optional filter criteria to scope summary metrics
   * @returns DLQSummaryResponse containing metrics aggregates
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:read' scope
   */
  public async getSummary(filters?: DLQSummaryFilterInput): Promise<DLQSummaryResponse> {
    const query: Record<string, string | undefined> = {};
    if (filters) {
      if (filters.projectId) query.projectId = filters.projectId;
      if (filters.destinationId) query.destinationId = filters.destinationId;
      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.status) query.status = filters.status;
      if (filters.reason) query.reason = filters.reason;
      if (filters.search) query.search = filters.search;
      if (filters.from) query.from = filters.from;
      if (filters.to) query.to = filters.to;
    }

    const res = await this.get<{ data: DLQSummaryResponse }>('/v1/dead-letters/summary', { query });
    return res.data;
  }

  /**
   * Retrieve complete dead-letter details including attempt timelines, HTTP statuses, and destination metadata.
   *
   * @param id The dead letter ID
   * @returns Detailed DeadLetterDetail record
   * @throws {NotFoundError} If the dead letter record does not exist
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:read' scope
   */
  public async get(id: string): Promise<DeadLetterDetail> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Dead letter ID is required and must be a non-empty string');
    }

    const res = await this.get<{ data: DeadLetterDetail }>(
      `/v1/dead-letters/${encodeURIComponent(id.trim())}`
    );
    return res.data;
  }

  /**
   * Replay an open dead-lettered delivery.
   *
   * Atomically claims the dead letter, creates a new delivery attempt transaction,
   * and publishes to the worker broker.
   *
   * Requires a mandatory 'Idempotency-Key' option. Replays with the same idempotency
   * key will safely return the existing replay transaction.
   *
   * @param id The dead letter ID
   * @param options Replay options containing the mandatory idempotencyKey
   * @returns ReplayResponse indicating created or existing replay status
   * @throws {ConflictError} If the dead letter is not in 'open' status
   * @throws {NotFoundError} If the dead letter does not exist
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:replay' scope
   */
  public async replay(
    id: string,
    options: ReplayDeadLetterOptions
  ): Promise<ReplayResponse> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Dead letter ID is required and must be a non-empty string');
    }
    if (
      !options?.idempotencyKey ||
      typeof options.idempotencyKey !== 'string' ||
      options.idempotencyKey.trim() === ''
    ) {
      throw new Error("Replay requires a non-empty 'idempotencyKey' option");
    }

    const res = await this.post<{ data: ReplayResponse }>(
      `/v1/dead-letters/${encodeURIComponent(id.trim())}/replay`,
      undefined,
      { idempotencyKey: options.idempotencyKey.trim() }
    );
    return res.data;
  }

  /**
   * Bulk replay multiple eligible open dead letters matching criteria.
   *
   * Requires a mandatory 'Idempotency-Key' option for the bulk batch operation.
   *
   * @param input Optional filter criteria and maximum batch limit (max 100)
   * @param options Replay options containing the mandatory idempotencyKey
   * @returns ReplayBulkResponse with batch outcome and individual replay details
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:replay' scope
   */
  public async replayBulk(
    input: ReplayBulkInput,
    options: ReplayDeadLetterOptions
  ): Promise<ReplayBulkResponse> {
    if (
      !options?.idempotencyKey ||
      typeof options.idempotencyKey !== 'string' ||
      options.idempotencyKey.trim() === ''
    ) {
      throw new Error("Replay bulk requires a non-empty 'idempotencyKey' option");
    }

    const res = await this.post<{ data: ReplayBulkResponse }>(
      '/v1/dead-letters/replay-bulk',
      input ?? {},
      { idempotencyKey: options.idempotencyKey.trim() }
    );
    return res.data;
  }

  /**
   * Dismiss an open dead letter, marking it as intentionally ignored without re-delivering.
   * Preserves the full underlying delivery attempt history.
   *
   * @param id The dead letter ID
   * @param input Optional operational dismissal reason
   * @returns Updated DeadLetter record
   * @throws {ConflictError} If the dead letter is not in 'open' status
   * @throws {NotFoundError} If the dead letter does not exist
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:manage' scope
   */
  public async dismiss(id: string, input?: DismissDLQInput): Promise<DeadLetter> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Dead letter ID is required and must be a non-empty string');
    }

    const res = await this.post<{ data: DeadLetter }>(
      `/v1/dead-letters/${encodeURIComponent(id.trim())}/dismiss`,
      input ?? {}
    );
    return res.data;
  }

  /**
   * Bulk dismiss eligible open dead letters matching filter criteria or explicit IDs.
   *
   * @param input Criteria or ID list to dismiss with optional reason
   * @returns BulkMutationResponse with affected count and item IDs
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:manage' scope
   */
  public async dismissBulk(input: DismissBulkDLQInput): Promise<BulkMutationResponse> {
    const res = await this.post<{ data: BulkMutationResponse }>(
      '/v1/dead-letters/dismiss-bulk',
      input ?? {}
    );
    return res.data;
  }

  /**
   * Manually resolve an open dead letter with an operational note explaining the resolution.
   *
   * @param id The dead letter ID
   * @param input Resolution details containing the mandatory resolution note
   * @returns Updated DeadLetter record
   * @throws {ValidationError} If resolution note is missing
   * @throws {ConflictError} If the dead letter is not in 'open' status
   * @throws {NotFoundError} If the dead letter does not exist
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:manage' scope
   */
  public async resolve(id: string, input: ResolveDLQInput): Promise<DeadLetter> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Dead letter ID is required and must be a non-empty string');
    }
    if (
      !input?.resolution ||
      typeof input.resolution !== 'string' ||
      input.resolution.trim() === ''
    ) {
      throw new Error("Resolution note is required and must be a non-empty string");
    }

    const res = await this.post<{ data: DeadLetter }>(
      `/v1/dead-letters/${encodeURIComponent(id.trim())}/resolve`,
      input
    );
    return res.data;
  }

  /**
   * Bulk manually resolve eligible open dead letters with an operational explanation.
   *
   * @param input Filter criteria or IDs with mandatory resolution note
   * @returns BulkMutationResponse with affected count and item IDs
   * @throws {ValidationError} If resolution note is missing
   * @throws {AuthenticationError} If the API key is invalid
   * @throws {AuthorizationError} If lacking 'delivery:manage' scope
   */
  public async resolveBulk(input: ResolveBulkDLQInput): Promise<BulkMutationResponse> {
    if (
      !input?.resolution ||
      typeof input.resolution !== 'string' ||
      input.resolution.trim() === ''
    ) {
      throw new Error("Resolution note is required and must be a non-empty string");
    }

    const res = await this.post<{ data: BulkMutationResponse }>(
      '/v1/dead-letters/resolve-bulk',
      input
    );
    return res.data;
  }
}
