// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Public API DTO Types
// Strongly typed contracts representing the Zyvan public API.
// ─────────────────────────────────────────────────────────────

export interface PaginationCursor {
  nextCursor?: string | null;
  hasMore?: boolean;
}

// ─── Projects ────────────────────────────────────────────────

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug?: string;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

// ─── Events ──────────────────────────────────────────────────

export interface SendEventInput {
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  projectId?: string;
}

export interface SendEventOptions {
  /**
   * Explicit idempotency key for this logical send operation.
   * If omitted, the SDK generates a unique key.
   */
  idempotencyKey?: string;
}

export interface IngestResponse {
  event_id: string;
  status: string;
  created_at: string;
  duplicate: boolean;
}

export interface EventFilterInput {
  eventType?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface EventSummary {
  id: string;
  eventType: string;
  status: string;
  createdAt: string | Date;
  idempotencyKey?: string;
  deliveryCount?: number;
}

export interface DeliveryAttemptSummary {
  id: string;
  attemptNumber: number;
  status: string;
  statusCode?: number | null;
  durationMs?: number | null;
  responseSnippet?: string | null;
  executedAt: string | Date;
}

export interface EventDeliverySummary {
  id: string;
  destinationId: string;
  destinationUrl?: string;
  status: string;
  attemptCount: number;
  lastStatusCode?: number | null;
  lastDeliveredAt?: string | Date | null;
  attempts: DeliveryAttemptSummary[];
}

export interface EventDetail {
  id: string;
  organizationId: string;
  projectId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  status: string;
  createdAt: string | Date;
  deliveries: EventDeliverySummary[];
}

export interface PaginatedEventsResponse {
  data: EventSummary[];
  pagination: PaginationCursor;
}

// ─── Destinations ────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries?: number;
  backoffRate?: number;
  initialIntervalSeconds?: number;
  maxIntervalSeconds?: number;
}

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export interface CreateDestinationInput {
  url: string;
  projectId?: string;
  secret?: string;
  retryPolicy?: RetryPolicy;
  rateLimit?: RateLimitPolicy;
}

export interface UpdateDestinationInput {
  url?: string;
  secret?: string;
  retryPolicy?: RetryPolicy;
  rateLimit?: RateLimitPolicy;
  active?: boolean;
}

export interface Destination {
  id: string;
  organizationId: string;
  projectId: string;
  url: string;
  active: boolean;
  rateLimit?: RateLimitPolicy | null;
  retryPolicy?: RetryPolicy | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface TestDestinationResponse {
  success: boolean;
  message: string;
  destinationUrl?: string;
}

// ─── Deliveries ──────────────────────────────────────────────

export interface Delivery {
  id: string;
  organizationId: string;
  destinationId: string;
  eventId: string;
  status: string;
  attemptCount: number;
  lastStatusCode?: number | null;
  lastDeliveredAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface ListDeliveriesInput {
  cursor?: string;
  limit?: number;
}

export interface PaginatedDeliveriesResponse {
  data: Delivery[];
  pagination: PaginationCursor;
}

// ─── Dead Letters (DLQ) ──────────────────────────────────────

export interface DeadLetter {
  id: string;
  organizationId: string;
  eventId: string;
  deliveryId: string;
  destinationId: string;
  status: 'open' | 'replaying' | 'resolved' | 'dismissed' | string;
  reason: string;
  errorMessage?: string | null;
  statusCode?: number | null;
  attemptCount: number;
  replayedAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  resolvedBy?: string | null;
  dismissedAt?: string | Date | null;
  dismissedBy?: string | null;
  dismissalReason?: string | null;
  resolution?: string | null;
  createdAt: string | Date;
}

export interface DLQFilterInput {
  projectId?: string;
  destinationId?: string;
  eventType?: string;
  status?: string;
  reason?: string;
  search?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface DLQSummaryFilterInput {
  projectId?: string;
  destinationId?: string;
  eventType?: string;
  status?: string;
  reason?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface DLQSummaryResponse {
  total: number;
  byStatus: {
    open: number;
    replaying: number;
    resolved: number;
    dismissed: number;
  };
  byReason: Record<string, number>;
  topDestinations: Array<{
    destinationId: string;
    destinationUrl?: string;
    count: number;
  }>;
}

export interface DeadLetterDetail extends DeadLetter {
  event: {
    id: string;
    eventType: string;
    idempotencyKey?: string;
    payload?: unknown;
    headers?: unknown;
    status: string;
    project?: unknown;
    createdAt: string | Date;
  };
  destination?: {
    id: string;
    url: string;
    active: boolean;
  };
  delivery: {
    id: string;
    status: string;
    attemptCount: number;
    lastStatusCode?: number | null;
    attempts: DeliveryAttemptSummary[];
  };
}

export interface PaginatedDeadLettersResponse {
  data: DeadLetter[];
  pagination: PaginationCursor;
}

export interface ReplayDeadLetterOptions {
  /**
   * Required Idempotency-Key header for single dead-letter replay.
   */
  idempotencyKey: string;
}

export interface ReplayResponse {
  status: 'created' | 'existing';
  replayId: string;
  deliveryId: string;
  deadLetterId: string;
  replayStatus: string;
  createdAt: string | Date;
}

export interface ReplayBulkFilter {
  projectId?: string;
  destinationId?: string;
  reason?: string;
  eventType?: string;
  from?: string;
  to?: string;
}

export interface ReplayBulkInput {
  filter?: ReplayBulkFilter;
  limit?: number;
}

export interface ReplayBulkResponse {
  status: 'created' | 'existing';
  batchId: string;
  requested: number;
  accepted: number;
  skipped: number;
  batchStatus: string;
  replays: Array<{
    replayId: string;
    deliveryId: string;
    deadLetterId: string;
    status: string;
    createdAt: string | Date;
  }>;
}

export interface DismissDLQInput {
  reason?: string;
}

export interface DismissBulkDLQInput {
  filter?: ReplayBulkFilter;
  ids?: string[];
  reason?: string;
  limit?: number;
}

export interface ResolveDLQInput {
  resolution: string;
}

export interface ResolveBulkDLQInput {
  filter?: ReplayBulkFilter;
  ids?: string[];
  resolution: string;
  limit?: number;
}

export interface BulkMutationResponse {
  requested: number;
  affected: number;
  dismissed?: number;
  resolved?: number;
  skipped: number;
  ids: string[];
  status: string;
}
