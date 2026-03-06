/**
 * Integration tests — POST /v1/events (ingest API)
 *
 * These tests use mocked Prisma + BullMQ so no real DB or Redis is required.
 * The Express app is spun up in-process and tested via supertest.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mock modules BEFORE importing the app ──────────────────────────────
vi.mock('../../src/config/db', () => ({ db: buildPrismaMock() }));
vi.mock('../../src/config/queue', () => ({ queue: buildQueueMock() }));
// Prevent the BullMQ worker from starting during tests
vi.mock('../../src/workers/dispatch', () => ({}));
// Prevent the logger from cluttering test output
vi.mock('../../src/config/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { buildPrismaMock, buildQueueMock, seedStore, store } from '../helpers/setup';
import { db } from '../../src/config/db';
import { queue } from '../../src/config/queue';

// Import app AFTER mocks are set up
import app from '../../src/index';

// ─────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────
let API_KEY: string;
let ENDPOINT_ID: string;

beforeAll(() => {
    const seeds = seedStore();
    API_KEY = seeds.rawKey;
    ENDPOINT_ID = seeds.endpointId;
});

beforeEach(() => {
    // Keep the store's events fresh but preserve api keys + endpoints
    store.events.clear();
    vi.clearAllMocks();
    // Re-seed after clear so mocks still work
    const seeds = seedStore();
    API_KEY = seeds.rawKey;
    ENDPOINT_ID = seeds.endpointId;
});

// ─────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.timestamp).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/events — ingest
// ─────────────────────────────────────────────────────────────────────────

describe('POST /v1/events', () => {
    const validBody = () => ({
        endpoint_id: ENDPOINT_ID,
        event_type: 'user.created',
        payload: { userId: 'u_001' },
    });

    it('→ 401 when x-api-key is missing', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('Idempotency-Key', 'key-001')
            .send(validBody());
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/api.key/i);
    });

    it('→ 401 when x-api-key is invalid', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', 'wrong-key')
            .set('Idempotency-Key', 'key-002')
            .send(validBody());
        expect(res.status).toBe(401);
    });

    it('→ 400 when Idempotency-Key header is missing', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .send(validBody());
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/idempotency/i);
    });

    it('→ 400 when Idempotency-Key header is blank', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', '   ')
            .send(validBody());
        expect(res.status).toBe(400);
    });

    it('→ 400 when endpoint_id is not a UUID', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'key-003')
            .send({ ...validBody(), endpoint_id: 'not-a-uuid' });
        expect(res.status).toBe(400);
        expect(res.body.details?.endpoint_id).toBeDefined();
    });

    it('→ 400 when payload is empty object', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'key-004')
            .send({ ...validBody(), payload: {} });
        expect(res.status).toBe(400);
        expect(res.body.details?.payload).toBeDefined();
    });

    it('→ 400 when event_type contains invalid characters', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'key-005')
            .send({ ...validBody(), event_type: 'event-type' }); // hyphen not allowed
        expect(res.status).toBe(400);
    });

    it('→ 404 when endpoint_id is not found', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'key-006')
            .send({ ...validBody(), endpoint_id: '00000000-0000-0000-0000-000000000000' });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/endpoint not found/i);
    });

    it('→ 202 Accepted for a valid new event', async () => {
        const res = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'unique-key-abc')
            .send(validBody());
        expect(res.status).toBe(202);
        expect(res.body.status).toBe('accepted');
        expect(res.body.event_id).toBeDefined();
        expect(res.body.idempotency_key).toBe('unique-key-abc');
    });

    it('→ enqueues the job after a successful ingest', async () => {
        await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'unique-key-enqueue')
            .send(validBody());
        expect(queue.add).toHaveBeenCalledOnce();
        const callArgs = (queue.add as any).mock.calls[0];
        expect(callArgs[0]).toBe('dispatch');
        expect(callArgs[1]).toHaveProperty('eventId');
    });

    it('→ 200 already_accepted when same Idempotency-Key is reused (idempotent)', async () => {
        const IDEM_KEY = 'idem-key-reuse-xyz';
        // First request
        const first = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', IDEM_KEY)
            .send(validBody());
        expect(first.status).toBe(202);

        // Second request with same key — event already in store
        const second = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', IDEM_KEY)
            .send(validBody());
        expect(second.status).toBe(200);
        expect(second.body.status).toBe('already_accepted');
        expect(second.body.event_id).toBe(first.body.event_id);
    });

    it('→ does NOT enqueue a job on duplicate idempotency key', async () => {
        const IDEM_KEY = 'idem-key-no-enqueue';
        await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', IDEM_KEY)
            .send(validBody());
        const callCountAfterFirst = (queue.add as any).mock.calls.length;

        await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', IDEM_KEY)
            .send(validBody());
        // Queue should NOT have been called again
        expect((queue.add as any).mock.calls.length).toBe(callCountAfterFirst);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/events
// ─────────────────────────────────────────────────────────────────────────

describe('GET /v1/events', () => {
    it('→ 401 without auth', async () => {
        const res = await request(app).get('/v1/events');
        expect(res.status).toBe(401);
    });

    it('→ 200 with empty data array initially', async () => {
        const res = await request(app)
            .get('/v1/events')
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.count).toBe(0);
    });

    it('→ 200 returns event after ingest', async () => {
        await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'list-test-key')
            .send({ endpoint_id: ENDPOINT_ID, event_type: 'order.paid', payload: { orderId: '42' } });

        const res = await request(app)
            .get('/v1/events')
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/events/:id
// ─────────────────────────────────────────────────────────────────────────

describe('GET /v1/events/:id', () => {
    it('→ 404 for unknown event id', async () => {
        const res = await request(app)
            .get('/v1/events/nonexistent-id')
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(404);
    });

    it('→ 200 with event data for known event', async () => {
        const ingest = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'get-by-id-key')
            .send({ endpoint_id: ENDPOINT_ID, event_type: 'test.event', payload: { x: 1 } });

        const res = await request(app)
            .get(`/v1/events/${ingest.body.event_id}`)
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(ingest.body.event_id);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/events/:id/replay
// ─────────────────────────────────────────────────────────────────────────

describe('POST /v1/events/:id/replay', () => {
    async function createEventWithStatus(status: string, idemKey: string) {
        const ingest = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', idemKey)
            .send({ endpoint_id: ENDPOINT_ID, event_type: 'test.event', payload: { x: 1 } });

        const eventId = ingest.body.event_id;
        // Manually force the status in the store
        const ev = store.events.get(eventId);
        if (ev) store.events.set(eventId, { ...ev, status });
        return eventId;
    }

    it('→ 404 for non-existent event', async () => {
        const res = await request(app)
            .post('/v1/events/does-not-exist/replay')
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(404);
    });

    it('→ 409 for a DELIVERED event (not DEAD_LETTERED)', async () => {
        const id = await createEventWithStatus('DELIVERED', 'replay-delivered-key');
        const res = await request(app)
            .post(`/v1/events/${id}/replay`)
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/dead_lettered/i);
    });

    it('→ 409 for a RECEIVED event', async () => {
        const id = await createEventWithStatus('RECEIVED', 'replay-received-key');
        const res = await request(app)
            .post(`/v1/events/${id}/replay`)
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(409);
    });

    it('→ 200 and re-enqueues a DEAD_LETTERED event', async () => {
        const id = await createEventWithStatus('DEAD_LETTERED', 'replay-dlq-key');
        const res = await request(app)
            .post(`/v1/events/${id}/replay`)
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('replaying');
        expect(res.body.event_id).toBe(id);
        // Queue job was added
        expect(queue.add).toHaveBeenCalled();
    });

    it('→ resets retryCount and failureReason on replay', async () => {
        const id = await createEventWithStatus('DEAD_LETTERED', 'replay-reset-key');
        // Manually set failure state
        const ev = store.events.get(id);
        if (ev) store.events.set(id, { ...ev, retryCount: 5, failureReason: 'HTTP 502' });

        await request(app)
            .post(`/v1/events/${id}/replay`)
            .set('x-api-key', API_KEY);

        const updated = store.events.get(id);
        expect(updated.retryCount).toBe(0);
        expect(updated.failureReason).toBeNull();
        expect(updated.status).toBe('DISPATCHING');
    });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /v1/events/replay/bulk
// ─────────────────────────────────────────────────────────────────────────

describe('POST /v1/events/replay/bulk', () => {
    it('→ 400 for missing event_ids', async () => {
        const res = await request(app)
            .post('/v1/events/replay/bulk')
            .set('x-api-key', API_KEY)
            .send({});
        expect(res.status).toBe(400);
    });

    it('→ 400 for empty event_ids array', async () => {
        const res = await request(app)
            .post('/v1/events/replay/bulk')
            .set('x-api-key', API_KEY)
            .send({ event_ids: [] });
        expect(res.status).toBe(400);
    });

    it('→ 400 for more than 100 event_ids', async () => {
        const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
        const res = await request(app)
            .post('/v1/events/replay/bulk')
            .set('x-api-key', API_KEY)
            .send({ event_ids: ids });
        expect(res.status).toBe(400);
    });

    it('→ 200 with replayed/failed summary for mixed batch', async () => {
        // Create one dead-lettered, one good
        const ingest = await request(app)
            .post('/v1/events')
            .set('x-api-key', API_KEY)
            .set('Idempotency-Key', 'bulk-dlq-key')
            .send({ endpoint_id: ENDPOINT_ID, event_type: 'bulk.test', payload: { x: 1 } });
        const dlqId = ingest.body.event_id;
        store.events.set(dlqId, { ...store.events.get(dlqId), status: 'DEAD_LETTERED' });

        const res = await request(app)
            .post('/v1/events/replay/bulk')
            .set('x-api-key', API_KEY)
            .send({ event_ids: [dlqId, 'nonexistent-id'] });
        expect(res.status).toBe(200);
        expect(res.body.replayed).toContain(dlqId);
        expect(res.body.failed.length).toBe(1); // nonexistent-id fails
    });
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/analytics/summary
// ─────────────────────────────────────────────────────────────────────────

describe('GET /v1/analytics/summary', () => {
    it('→ 401 without auth', async () => {
        const res = await request(app).get('/v1/analytics/summary');
        expect(res.status).toBe(401);
    });

    it('→ 200 with summary fields', async () => {
        const res = await request(app)
            .get('/v1/analytics/summary')
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('delivered');
        expect(res.body).toHaveProperty('dead_lettered');
        expect(res.body).toHaveProperty('retrying');
        expect(res.body).toHaveProperty('success_rate');
    });
});

// ─────────────────────────────────────────────────────────────────────────
// GET /v1/endpoints
// ─────────────────────────────────────────────────────────────────────────

describe('GET /v1/endpoints', () => {
    it('→ 401 without auth', async () => {
        const res = await request(app).get('/v1/endpoints');
        expect(res.status).toBe(401);
    });

    it('→ 200 with endpoint list', async () => {
        const res = await request(app)
            .get('/v1/endpoints')
            .set('x-api-key', API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        // signing_secret must NEVER appear in list response
        for (const ep of res.body.data) {
            expect(ep.signingSecret).toBeUndefined();
            expect(ep.signing_secret).toBeUndefined();
        }
    });
});
