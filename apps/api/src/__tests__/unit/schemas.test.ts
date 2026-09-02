import { describe, it, expect } from 'vitest';
import {
  CreateEventSchema,
  CreateTenantSchema,
  CreateDestinationSchema,
  CreateApiKeySchema,
  EventFilterSchema,
} from '@zyvan/schemas';

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

    it('rejects non-url destination targets', () => {
      expect(() =>
        CreateDestinationSchema.parse({
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          url: 'not-a-valid-url',
        })
      ).toThrow();
    });
  });

  describe('CreateApiKeySchema', () => {
    it('validates allowed scopes', () => {
      const valid = {
        name: 'Production Key',
        scopes: ['events:write', 'events:read'],
      };
      const parsed = CreateApiKeySchema.parse(valid);
      expect(parsed.scopes).toContain('events:write');
    });

    it('rejects empty scopes', () => {
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
});
