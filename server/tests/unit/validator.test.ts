import { describe, it, expect } from 'vitest';
import { IngestEventSchema } from '../../src/api/events/validator';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('IngestEventSchema — valid inputs', () => {
    it('accepts a complete valid payload', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'user.created',
            payload: { userId: 'abc123' },
            metadata: { source: 'signup_flow' },
        });
        expect(result.success).toBe(true);
    });

    it('accepts payload without optional metadata', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'order.completed',
            payload: { orderId: '999' },
        });
        expect(result.success).toBe(true);
    });

    it('accepts event_type with dots and underscores', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'payment.invoice_paid',
            payload: { amount: 100 },
        });
        expect(result.success).toBe(true);
    });

    it('accepts event_type up to 100 chars', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'a'.repeat(100),
            payload: { x: 1 },
        });
        expect(result.success).toBe(true);
    });
});

describe('IngestEventSchema — invalid inputs', () => {
    it('rejects non-UUID endpoint_id', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: 'not-a-uuid',
            event_type: 'test.event',
            payload: { x: 1 },
        });
        expect(result.success).toBe(false);
        expect(result.error?.flatten().fieldErrors.endpoint_id).toBeDefined();
    });

    it('rejects empty event_type', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: '',
            payload: { x: 1 },
        });
        expect(result.success).toBe(false);
        expect(result.error?.flatten().fieldErrors.event_type).toBeDefined();
    });

    it('rejects event_type over 100 chars', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'a'.repeat(101),
            payload: { x: 1 },
        });
        expect(result.success).toBe(false);
    });

    it('rejects event_type with invalid characters (spaces)', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'event type',
            payload: { x: 1 },
        });
        expect(result.success).toBe(false);
    });

    it('rejects event_type with hyphens', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'event-type',
            payload: { x: 1 },
        });
        expect(result.success).toBe(false);
    });

    it('rejects empty payload object', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'test.event',
            payload: {},
        });
        expect(result.success).toBe(false);
        expect(result.error?.flatten().fieldErrors.payload).toBeDefined();
    });

    it('rejects missing payload', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'test.event',
        });
        expect(result.success).toBe(false);
    });

    it('rejects missing endpoint_id', () => {
        const result = IngestEventSchema.safeParse({
            event_type: 'test.event',
            payload: { x: 1 },
        });
        expect(result.success).toBe(false);
    });

    it('rejects array as payload (must be object)', () => {
        const result = IngestEventSchema.safeParse({
            endpoint_id: VALID_UUID,
            event_type: 'test.event',
            payload: [1, 2, 3],
        });
        expect(result.success).toBe(false);
    });
});
