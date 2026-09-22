// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Official TypeScript / Node.js Client
// ─────────────────────────────────────────────────────────────

export { ZyvanClient } from './client';
export type { WebhookVerifyOptions } from './client';
export { HttpTransport } from './transport';

// Resources
export {
  Resource,
  ProjectsResource,
  EventsResource,
  DestinationsResource,
  DeliveriesResource,
  DeadLettersResource,
} from './resources';

// Errors
export {
  ZyvanError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  parseRetryAfter,
  createZyvanErrorFromResponse,
} from './errors';

export type {
  ZyvanErrorOptions,
  RateLimitErrorOptions,
  NetworkErrorCode,
  NetworkErrorOptions,
} from './errors';

// Transport & Client Types
export type {
  ZyvanClientOptions,
  RequestOptions,
  ApiResponse,
  HttpMethod,
  ZyvanApiErrorBody,
} from './types';

// Public API DTOs & Resource Types
export type {
  PaginationCursor,
  Project,
  SendEventInput,
  SendEventOptions,
  IngestResponse,
  EventFilterInput,
  EventSummary,
  DeliveryAttemptSummary,
  EventDeliverySummary,
  EventDetail,
  PaginatedEventsResponse,
  RetryPolicy,
  RateLimitPolicy,
  CreateDestinationInput,
  UpdateDestinationInput,
  Destination,
  DestinationListInput,
  TestDestinationInput,
  TestDestinationResponse,
  Delivery,
  ListDeliveriesInput,
  PaginatedDeliveriesResponse,
  DeadLetter,
  DeadLetterDetail,
  DLQFilterInput,
  DLQSummaryFilterInput,
  DLQSummaryResponse,
  PaginatedDeadLettersResponse,
  ReplayDeadLetterOptions,
  ReplayResponse,
  ReplayBulkFilter,
  ReplayBulkInput,
  ReplayBulkResponse,
  DismissDLQInput,
  DismissBulkDLQInput,
  ResolveDLQInput,
  ResolveBulkDLQInput,
  BulkMutationResponse,
} from './resources';
