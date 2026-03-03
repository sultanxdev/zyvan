/**
 * Shared TypeScript types for Zyvan server.
 * These mirror Prisma-generated types but are
 * decoupled for use in service layers.
 */

export type EventStatus =
    | 'RECEIVED'
    | 'DISPATCHING'
    | 'DELIVERED'
    | 'RETRY_SCHEDULED'
    | 'DEAD_LETTERED';

export interface IngestPayload {
    endpoint_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
    success: boolean;
    httpStatus?: number;
    errorMessage?: string;
    latencyMs: number;
}
