/**
 * Integration test helpers.
 *
 * Integration tests use vitest's vi.mock() to intercept Prisma and BullMQ
 * so they run offline (no real DB or Redis required).
 *
 * The mock store is an in-memory representation that simulates the core
 * Prisma query patterns used by the API routes.
 */
import { vi } from 'vitest';
import crypto from 'crypto';

// ── In-memory store ─────────────────────────────────────────────────────

export const store = {
    apiKeys: new Map<string, any>(),
    endpoints: new Map<string, any>(),
    events: new Map<string, any>(),
};

/** Seed a valid API key and test endpoint into the store before each test suite. */
export function seedStore() {
    store.apiKeys.clear();
    store.endpoints.clear();
    store.events.clear();

    // Create a test API key
    const rawKey = 'zv_live_test_key_1234567890abcdef';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKeyId = 'api-key-uuid-0001';
    store.apiKeys.set(keyHash, {
        id: apiKeyId,
        keyHash,
        prefix: 'zv_live_test',
        name: 'Test Key',
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
    });

    // Create a test endpoint — must be a valid UUID so Zod passes
    const endpointId = '11111111-1111-1111-1111-111111111111';
    store.endpoints.set(endpointId, {
        id: endpointId,
        url: 'https://webhook.site/test-hook',
        signingSecret: 'test-signing-secret',
        maxRetries: 5,
        timeoutMs: 30000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { events: 0 },
    });

    return { rawKey, endpointId };
}

/** Build a Prisma mock that delegates to the in-memory store. */
export function buildPrismaMock() {
    return {
        apiKey: {
            findUnique: vi.fn(({ where }: any) => {
                if (where.keyHash) return Promise.resolve(store.apiKeys.get(where.keyHash) ?? null);
                if (where.id) {
                    for (const v of store.apiKeys.values()) if (v.id === where.id) return Promise.resolve(v);
                }
                return Promise.resolve(null);
            }),
            update: vi.fn(({ where, data }: any) => {
                for (const [k, v] of store.apiKeys) {
                    if (v.id === where.id) {
                        const updated = { ...v, ...data };
                        store.apiKeys.set(k, updated);
                        return Promise.resolve(updated);
                    }
                }
                return Promise.resolve(null);
            }),
            create: vi.fn(({ data }: any) => {
                const key = { id: `api-key-${Date.now()}`, ...data, createdAt: new Date(), lastUsedAt: null };
                store.apiKeys.set(data.keyHash, key);
                return Promise.resolve(key);
            }),
            findMany: vi.fn(() => Promise.resolve([...store.apiKeys.values()].filter(k => k.isActive))),
        },
        endpoint: {
            findFirst: vi.fn(({ where }: any) => {
                const ep = store.endpoints.get(where.id);
                if (!ep) return Promise.resolve(null);
                if (where.isActive !== undefined && ep.isActive !== where.isActive) return Promise.resolve(null);
                return Promise.resolve(ep);
            }),
            findUnique: vi.fn(({ where }: any) => {
                return Promise.resolve(store.endpoints.get(where.id) ?? null);
            }),
            findMany: vi.fn(() => Promise.resolve([...store.endpoints.values()].filter(e => e.isActive))),
            create: vi.fn(({ data }: any) => {
                const ep = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}-0000-0000-000000000000`, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date(), _count: { events: 0 } };
                store.endpoints.set(ep.id, ep);
                return Promise.resolve(ep);
            }),
            update: vi.fn(({ where, data }: any) => {
                const ep = store.endpoints.get(where.id);
                if (!ep) throw new Error('Not found');
                const updated = { ...ep, ...data, updatedAt: new Date() };
                store.endpoints.set(where.id, updated);
                return Promise.resolve(updated);
            }),
        },
        event: {
            findUnique: vi.fn(({ where }: any) => {
                if (where.id) return Promise.resolve(store.events.get(where.id) ?? null);
                if (where.idempotencyKey) {
                    for (const v of store.events.values()) if (v.idempotencyKey === where.idempotencyKey) return Promise.resolve(v);
                }
                return Promise.resolve(null);
            }),
            findMany: vi.fn(({ where, orderBy, take, skip, include }: any) => {
                let results = [...store.events.values()];
                if (where?.status) results = results.filter(e => e.status === where.status);
                if (where?.endpointId) results = results.filter(e => e.endpointId === where.endpointId);
                return Promise.resolve(results.slice(skip ?? 0, (skip ?? 0) + (take ?? 20)));
            }),
            create: vi.fn(({ data }: any) => {
                const event = {
                    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    ...data,
                    retryCount: 0,
                    failureReason: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    attempts: [],
                };
                store.events.set(event.id, event);
                return Promise.resolve(event);
            }),
            update: vi.fn(({ where, data }: any) => {
                const ev = store.events.get(where.id);
                if (!ev) throw new Error('Event not found');
                // handle Prisma increment syntax
                const updates: any = {};
                for (const [k, v] of Object.entries(data as any)) {
                    if (v && typeof v === 'object' && 'increment' in (v as any)) {
                        updates[k] = ev[k] + (v as any).increment;
                    } else {
                        updates[k] = v;
                    }
                }
                const updated = { ...ev, ...updates, updatedAt: new Date() };
                store.events.set(where.id, updated);
                return Promise.resolve(updated);
            }),
            count: vi.fn(({ where }: any = {}) => {
                if (!where) return Promise.resolve(store.events.size);
                let results = [...store.events.values()];
                if (where.status) results = results.filter(e => e.status === where.status);
                return Promise.resolve(results.length);
            }),
        },
        deliveryAttempt: {
            create: vi.fn(({ data }: any) => Promise.resolve({ id: `att-${Date.now()}`, ...data })),
        },
        $transaction: vi.fn(async (fn: any) => fn({
            // Pass the same mock delegates into the transaction
            event: {
                findUnique: vi.fn(({ where }: any) => {
                    if (where.idempotencyKey) {
                        for (const v of store.events.values()) if (v.idempotencyKey === where.idempotencyKey) return Promise.resolve(v);
                        return Promise.resolve(null);
                    }
                    return Promise.resolve(store.events.get(where.id) ?? null);
                }),
                create: vi.fn(({ data }: any) => {
                    const event = { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`, ...data, retryCount: 0, failureReason: null, createdAt: new Date(), updatedAt: new Date() };
                    store.events.set(event.id, event);
                    return Promise.resolve(event);
                }),
            },
            endpoint: {
                findFirst: vi.fn(({ where }: any) => {
                    const ep = store.endpoints.get(where.id);
                    if (!ep) return Promise.resolve(null);
                    if (where.isActive !== undefined && ep.isActive !== where.isActive) return Promise.resolve(null);
                    return Promise.resolve(ep);
                }),
            },
        })),
    };
}

/** Build a BullMQ Queue mock (no-op add). */
export function buildQueueMock() {
    return {
        add: vi.fn(() => Promise.resolve({ id: `job-${Date.now()}` })),
        on: vi.fn(),
    };
}
