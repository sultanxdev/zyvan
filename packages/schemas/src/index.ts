// ─────────────────────────────────────────────────────────────
// Zyvan Shared Schemas
// Zod validation schemas and inferred TypeScript types used
// across API, Worker, and Frontend.
// ─────────────────────────────────────────────────────────────

import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────

export const ProjectStatusEnum = z.enum(['active', 'disabled']);
export const TenantStatusEnum = z.enum(['active', 'paused', 'disabled']);
export const EventStatusEnum = z.enum([
  'queued',
  'delivering',
  'retrying',
  'delivered',
  'dead_letter',
  'expired',
  'cancelled',
]);
export const DeliveryStatusEnum = z.enum([
  'queued',
  'delivering',
  'retrying',
  'delivered',
  'failed',
  'cancelled',
]);
export const AttemptOutcomeEnum = z.enum(['success', 'failed', 'timeout', 'error']);
export const ReplayStatusEnum = z.enum(['queued', 'delivering', 'delivered', 'failed']);

export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
export type TenantStatus = z.infer<typeof TenantStatusEnum>;
export type EventStatus = z.infer<typeof EventStatusEnum>;
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;
export type AttemptOutcome = z.infer<typeof AttemptOutcomeEnum>;
export type ReplayStatus = z.infer<typeof ReplayStatusEnum>;

// ─── User Schemas ────────────────────────────────────────────

export const SignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatar: z.string().url().max(512).optional(),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ─── Project Schemas ─────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  plan: z.string().max(50).optional().default('free'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: ProjectStatusEnum.optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ─── API Key Schemas ─────────────────────────────────────────

export const API_KEY_SCOPES = [
  'events:write',
  'events:read',
  'destinations:manage',
  'tenants:manage',
  'api-keys:manage',
  'projects:read',
  'projects:manage',
  'usage:read',
] as const;

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1),
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

// ─── Tenant Schemas ──────────────────────────────────────────

export const CreateTenantSchema = z.object({
  externalId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  concurrencyLimit: z.number().int().min(1).max(100).optional().default(5),
  rateLimit: z.number().int().min(1).max(10000).optional().default(100),
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  concurrencyLimit: z.number().int().min(1).max(100).optional(),
  rateLimit: z.number().int().min(1).max(10000).optional(),
  status: TenantStatusEnum.optional(),
});

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;

// ─── Destination Schemas ─────────────────────────────────────

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(20).optional().default(5),
  baseDelay: z.number().int().min(1).max(3600).optional().default(1), // seconds
  maxDelay: z.number().int().min(1).max(86400).optional().default(3600), // seconds
});

export const CreateDestinationSchema = z.object({
  tenantId: z.string().uuid(),
  url: z.string().url().max(2048),
  secret: z.string().min(16).max(512).optional(),
  retryPolicy: RetryPolicySchema.optional().default({}),
  rateLimit: z.number().int().min(1).max(1000).optional().default(20),
});

export const UpdateDestinationSchema = z.object({
  url: z.string().url().max(2048).optional(),
  secret: z.string().min(16).max(512).optional(),
  retryPolicy: RetryPolicySchema.optional(),
  rateLimit: z.number().int().min(1).max(1000).optional(),
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
export type CreateDestinationInput = z.infer<typeof CreateDestinationSchema>;
export type UpdateDestinationInput = z.infer<typeof UpdateDestinationSchema>;

// ─── Event Schemas ───────────────────────────────────────────

export const CreateEventSchema = z.object({
  type: z.string().min(1).max(255),
  tenant_id: z.string().min(1).max(255),
  idempotency_key: z.string().min(1).max(255),
  data: z.record(z.unknown()).optional().default({}),
  headers: z.record(z.string()).optional().default({}),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

// ─── Replay Schema ───────────────────────────────────────────

export const CreateReplaySchema = z.object({
  destinationId: z.string().uuid().optional(), // If omitted, replay to all original destinations
});

export type CreateReplayInput = z.infer<typeof CreateReplaySchema>;

// ─── Pagination Schema ───────────────────────────────────────

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

// ─── Event Filter Schema ─────────────────────────────────────

export const EventFilterSchema = PaginationSchema.extend({
  eventType: z.string().optional(),
  tenantId: z.string().optional(),
  destinationId: z.string().optional(),
  status: EventStatusEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().optional(),
});

export type EventFilterInput = z.infer<typeof EventFilterSchema>;

// ─── Error Contract ──────────────────────────────────────────

export const ERROR_CODES = [
  'invalid_request',
  'authentication_failed',
  'authorization_denied',
  'duplicate_idempotency_key',
  'rate_limited',
  'not_found',
  'conflict',
  'payload_too_large',
  'internal_error',
] as const;

export const ErrorResponseSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  request_id: z.string(),
  details: z.record(z.unknown()).optional().default({}),
});

export type ErrorCode = (typeof ERROR_CODES)[number];
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
