// ─────────────────────────────────────────────────────────────
// Zyvan API — Multi-Tenant Isolation & RBAC Security Tests
// Validates strict tenant boundaries, role hierarchies, and API key scopes.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { hasPermission, assertPermission } from '@zyvan/auth';
import { hashApiKey, generateApiKey } from '@zyvan/crypto';
import { authorize } from '../../middleware/authorize';

describe('Multi-Tenant Isolation & RBAC Security Suite', () => {
  describe('RBAC Role Hierarchy & Principle of Least Privilege', () => {
    it('OWNER has complete access across all organization resources', () => {
      expect(hasPermission('owner', 'organization', 'manage')).toBe(true);
      expect(hasPermission('owner', 'organizations', 'delete')).toBe(true);
      expect(hasPermission('owner', 'member', 'delete')).toBe(true);
      expect(hasPermission('owner', 'project', 'delete')).toBe(true);
      expect(hasPermission('owner', 'destination', 'create')).toBe(true);
      expect(hasPermission('owner', 'event', 'create')).toBe(true);
      expect(hasPermission('owner', 'delivery', 'replay')).toBe(true);
      expect(hasPermission('owner', 'apiKey', 'create')).toBe(true);
    });

    it('ADMIN has operational control but CANNOT delete the organization', () => {
      expect(hasPermission('admin', 'organization', 'read')).toBe(true);
      expect(hasPermission('admin', 'organization', 'update')).toBe(true);
      expect(hasPermission('admin', 'organization', 'delete')).toBe(false);
      expect(hasPermission('admin', 'members', 'create')).toBe(true);
      expect(hasPermission('admin', 'members', 'delete')).toBe(true);
      expect(hasPermission('admin', 'projects', 'create')).toBe(true);
      expect(hasPermission('admin', 'projects', 'delete')).toBe(true);
    });

    it('MEMBER cannot manage organization members or delete projects', () => {
      expect(hasPermission('member', 'organization', 'read')).toBe(true);
      expect(hasPermission('member', 'organization', 'update')).toBe(false);
      expect(hasPermission('member', 'members', 'create')).toBe(false);
      expect(hasPermission('member', 'members', 'delete')).toBe(false);
      expect(hasPermission('member', 'projects', 'create')).toBe(true);
      expect(hasPermission('member', 'projects', 'delete')).toBe(false);
      expect(hasPermission('member', 'destinations', 'create')).toBe(true);
      expect(hasPermission('member', 'events', 'create')).toBe(true);
      expect(hasPermission('member', 'delivery', 'replay')).toBe(true);
    });

    it('VIEWER is strictly read-only and denied from all mutating operations', () => {
      expect(hasPermission('viewer', 'organization', 'read')).toBe(true);
      expect(hasPermission('viewer', 'projects', 'read')).toBe(true);
      expect(hasPermission('viewer', 'destinations', 'read')).toBe(true);
      expect(hasPermission('viewer', 'events', 'read')).toBe(true);

      // Mutating operations strictly forbidden
      expect(hasPermission('viewer', 'projects', 'create')).toBe(false);
      expect(hasPermission('viewer', 'destinations', 'create')).toBe(false);
      expect(hasPermission('viewer', 'events', 'create')).toBe(false);
      expect(hasPermission('viewer', 'delivery', 'replay')).toBe(false);
      expect(hasPermission('viewer', 'api_keys', 'create')).toBe(false);
      expect(hasPermission('viewer', 'members', 'create')).toBe(false);
    });

    it('assertPermission throws 403 authorization_denied for unauthorized actions', () => {
      expect(() => {
        assertPermission('viewer', 'projects', 'create');
      }).toThrowError(/Forbidden: Role 'viewer' lacks permission/);

      try {
        assertPermission('member', 'members', 'delete');
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('authorization_denied');
      }
    });
  });

  describe('API Key Cryptographic Integrity & Scope Isolation', () => {
    it('hashes API keys with unique pepper producing immutable digests', () => {
      const { key, prefix } = generateApiKey();
      expect(key.startsWith('zyvan_live_')).toBe(true);
      expect(prefix.startsWith('zyvan_live_')).toBe(true);

      const hash1 = hashApiKey(key, 'pepper_a');
      const hash2 = hashApiKey(key, 'pepper_b');
      expect(hash1).not.toBe(hash2);
      expect(hash1).toBe(hashApiKey(key, 'pepper_a')); // Deterministic
    });

    it('enforces least-privilege scoping: write scope cannot read or manage other resources', () => {
      const req: any = {
        auth: {
          type: 'api_key',
          apiKeyId: 'key_123',
          organizationId: 'org_abc',
          projectId: 'proj_xyz',
          scopes: ['events:write'],
        },
      };

      let passed = false;
      const next = () => {
        passed = true;
      };

      let denied = false;
      const res: any = {
        status: (code: number) => {
          if (code === 403) denied = true;
          return { json: () => {} };
        },
      };

      // Allowed: events:write matches
      authorize('events:write')(req, res, next);
      expect(passed).toBe(true);

      // Denied: projects:manage is forbidden for this key
      passed = false;
      authorize('projects:manage')(req, res, next);
      expect(passed).toBe(false);
      expect(denied).toBe(true);
    });
  });
});
