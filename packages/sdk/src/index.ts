// ─────────────────────────────────────────────────────────────
// Zyvan SDK — Official TypeScript / Node.js Client
// ─────────────────────────────────────────────────────────────

export { ZyvanClient } from './client';
export { HttpTransport } from './transport';

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

export type {
  ZyvanClientOptions,
  RequestOptions,
  ApiResponse,
  HttpMethod,
  ZyvanApiErrorBody,
} from './types';

// Legacy compatibility exports (migrated under structured modules in PR 4.2 / PR 4.4)
export type {
  SendEventInput,
  IngestResponse,
  WebhookVerifyOptions,
} from './client';
