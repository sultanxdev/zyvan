import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ROLES,
  VALID_ROLES,
  isValidRole,
  hasPermission,
  assertPermission,
  getRolePermissions,
} from '../index';
import { normalizeResource } from '../permissions';
import { logAuditEvent, AuditLogParams } from '../audit';

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock('@zyvan/db', () => ({
  getPrismaClient: () => ({
    auditLog: {
      create: mockCreate,
    },
  }),
}));

vi.mock('@zyvan/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('@zyvan/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Roles & Validation', () => {
    it('defines expected role constants', () => {
      expect(ROLES.OWNER).toBe('owner');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MEMBER).toBe('member');
      expect(ROLES.VIEWER).toBe('viewer');
    });

    it('correctly validates valid roles', () => {
      for (const role of VALID_ROLES) {
        expect(isValidRole(role)).toBe(true);
      }
    });

    it('rejects invalid roles', () => {
      expect(isValidRole('superuser')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
      expect(isValidRole(null)).toBe(false);
    });
  });

  describe('Resource Normalization', () => {
    it('normalizes singular and plural resource aliases', () => {
      expect(normalizeResource('organizations')).toBe('organization');
      expect(normalizeResource('organization')).toBe('organization');
      expect(normalizeResource('members')).toBe('member');
      expect(normalizeResource('member')).toBe('member');
      expect(normalizeResource('projects')).toBe('project');
      expect(normalizeResource('destinations')).toBe('destination');
      expect(normalizeResource('events')).toBe('event');
      expect(normalizeResource('deliveries')).toBe('delivery');
      expect(normalizeResource('replay')).toBe('delivery');
      expect(normalizeResource('api_keys')).toBe('apiKey');
      expect(normalizeResource('audit_logs')).toBe('auditLog');
      expect(normalizeResource('usage')).toBe('project');
    });
  });

  describe('Permission Matrix & Enforcement', () => {
    it('grants owner broad permissions across resources', () => {
      expect(hasPermission('owner', 'project', 'create')).toBe(true);
      expect(hasPermission('owner', 'project', 'delete')).toBe(true);
      expect(hasPermission('owner', 'organization', 'manage')).toBe(true);
      expect(hasPermission('owner', 'destination', 'manage')).toBe(true);
    });

    it('restricts viewer to read-only operations', () => {
      expect(hasPermission('viewer', 'project', 'read')).toBe(true);
      expect(hasPermission('viewer', 'delivery', 'read')).toBe(true);
      expect(hasPermission('viewer', 'project', 'create')).toBe(false);
      expect(hasPermission('viewer', 'destination', 'delete')).toBe(false);
      expect(hasPermission('viewer', 'api_key', 'create')).toBe(false);
    });

    it('assertPermission throws Error on forbidden access', () => {
      expect(() => {
        assertPermission('viewer', 'project', 'create');
      }).toThrow();
    });

    it('assertPermission does not throw on permitted access', () => {
      expect(() => {
        assertPermission('admin', 'project', 'create');
      }).not.toThrow();
    });

    it('returns statements from getRolePermissions', () => {
      const viewerPerms = getRolePermissions('viewer');
      expect(viewerPerms.length).toBeGreaterThan(0);
      expect(viewerPerms.every((p) => p.endsWith(':read'))).toBe(true);
    });
  });

  describe('Security Audit Logging', () => {
    it('sanitizes secrets, passwords, apiKeys from metadata before persisting', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'audit-1' });

      const auditParams: AuditLogParams = {
        organizationId: 'org-123',
        userId: 'user-456',
        action: 'api_key.created',
        resourceType: 'apiKey',
        resourceId: 'key-789',
        metadata: {
          keyName: 'Production Key',
          password: 'sensitive_password',
          secret: 'whsec_abcdef123456',
          apiKey: 'zy_live_secret123',
          rawKey: 'zy_live_rawkey456',
          allowedOrigins: ['https://example.com'],
        },
      };

      await logAuditEvent(auditParams);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callData = mockCreate.mock.calls[0][0].data;

      expect(callData.organizationId).toBe('org-123');
      expect(callData.userId).toBe('user-456');
      expect(callData.action).toBe('api_key.created');
      expect(callData.metadata.keyName).toBe('Production Key');
      expect(callData.metadata.allowedOrigins).toEqual(['https://example.com']);

      // Ensure secret fields are strictly stripped
      expect(callData.metadata.password).toBeUndefined();
      expect(callData.metadata.secret).toBeUndefined();
      expect(callData.metadata.apiKey).toBeUndefined();
      expect(callData.metadata.rawKey).toBeUndefined();
    });
  });
});
