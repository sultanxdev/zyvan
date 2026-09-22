import { describe, it, expect } from 'vitest';
import {
  CreateEventSchema,
  CreateTenantSchema,
  CreateDestinationSchema,
  CreateApiKeySchema,
  EventFilterSchema,
  DLQFilterSchema,
  DLQSummaryFilterSchema,
} from '@zyvan/validation';

describe('API Validation Schemas', () => {
  describe('CreateEventSchema', () => {
    it('validates a correct event payload', () => {
      const valid = {
        type: 'invoice.paid',
        tenant_id: 'tenant_123',
        idempotency_key: 'idemp_key_abc',
        data: { amount: 1500, currency: 'USD' },
      };
      const parsed = CreateEventSchema.parse(valid);
      expect(parsed.type).toBe('invoice.paid');
      expect(parsed.tenant_id).toBe('tenant_123');
      expect(parsed.idempotency_key).toBe('idemp_key_abc');
    });

    it('rejects missing required fields', () => {
      expect(() => CreateEventSchema.parse({ type: 'invoice.paid' })).toThrow();
      expect(() => CreateEventSchema.parse({ tenant_id: 't_1' })).toThrow();
    });
  });

  describe('CreateTenantSchema', () => {
    it('validates and applies defaults for concurrency and rate limits', () => {
      const parsed = CreateTenantSchema.parse({
        externalId: 'ext_tenant_1',
        name: 'Acme Corp',
      });
      expect(parsed.concurrencyLimit).toBe(5);
      expect(parsed.rateLimit).toBe(100);
    });

    it('rejects invalid limit values', () => {
      expect(() =>
        CreateTenantSchema.parse({
          externalId: 'ext_1',
          name: 'Acme',
          concurrencyLimit: -1,
        })
      ).toThrow();
    });
  });

  describe('CreateDestinationSchema', () => {
    it('validates URL format and UUID tenant ID', () => {
      const valid = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        url: 'https://example.com/webhooks',
        rateLimit: 25,
      };
      const parsed = CreateDestinationSchema.parse(valid);
      expect(parsed.url).toBe('https://example.com/webhooks');
      expect(parsed.rateLimit).toBe(25);
    });
  });

  describe('CreateApiKeySchema', () => {
    it('validates key creation payload', () => {
      const parsed = CreateApiKeySchema.parse({
        name: 'Production Worker Key',
        scopes: ['events:write', 'delivery:read'],
      });
      expect(parsed.name).toBe('Production Worker Key');
      expect(parsed.scopes).toContain('events:write');
    });

    it('requires name and non-empty scopes', () => {
      expect(() =>
        CreateApiKeySchema.parse({
          name: 'Invalid Key',
          scopes: [],
        })
      ).toThrow();
    });
  });

  describe('EventFilterSchema', () => {
    it('parses optional filters and sets default pagination limit', () => {
      const parsed = EventFilterSchema.parse({
        eventType: 'invoice.paid',
      });
      expect(parsed.limit).toBe(50);
      expect(parsed.eventType).toBe('invoice.paid');
    });
  });

  describe('DLQFilterSchema', () => {
    it('defaults status to open and limit to 50 for triage listing', () => {
      const parsed = DLQFilterSchema.parse({});
      expect(parsed.status).toBe('open');
      expect(parsed.limit).toBe(50);
    });

    it('allows overriding status and structured reason', () => {
      const parsed = DLQFilterSchema.parse({
        status: 'resolved',
        reason: 'terminal_4xx',
        limit: 25,
      });
      expect(parsed.status).toBe('resolved');
      expect(parsed.reason).toBe('terminal_4xx');
      expect(parsed.limit).toBe(25);
    });

    it('rejects invalid reason or status enum', () => {
      expect(() => DLQFilterSchema.parse({ reason: 'unknown_reason' })).toThrow();
      expect(() => DLQFilterSchema.parse({ status: 'invalid_status' })).toThrow();
    });
  });

  describe('DLQSummaryFilterSchema', () => {
    it('leaves status undefined by default so summary computes across all statuses', () => {
      const parsed = DLQSummaryFilterSchema.parse({});
      expect(parsed.status).toBeUndefined();
    });

    it('allows specifying status to filter summary to a specific lifecycle status', () => {
      const parsed = DLQSummaryFilterSchema.parse({
        status: 'open',
        reason: 'retries_exhausted',
      });
      expect(parsed.status).toBe('open');
      expect(parsed.reason).toBe('retries_exhausted');
    });
  });
});
