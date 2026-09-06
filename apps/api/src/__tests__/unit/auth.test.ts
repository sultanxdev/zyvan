import { describe, it, expect } from 'vitest';
import { SignupSchema, LoginSchema } from '@zyvan/schemas';
import { signUserToken, verifyUserToken } from '../../modules/auth/user-service';
import { authorize } from '../../middleware/authorize';

describe('User Authentication & Authorization', () => {
  describe('SignupSchema', () => {
    it('validates valid signup payload', () => {
      const valid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securepassword123',
      };
      const parsed = SignupSchema.parse(valid);
      expect(parsed.name).toBe('Jane Doe');
      expect(parsed.email).toBe('jane@example.com');
    });

    it('rejects passwords shorter than 8 characters', () => {
      expect(() =>
        SignupSchema.parse({
          name: 'Jane',
          email: 'jane@example.com',
          password: 'short',
        })
      ).toThrow();
    });

    it('rejects invalid emails', () => {
      expect(() =>
        SignupSchema.parse({
          name: 'Jane',
          email: 'not-an-email',
          password: 'password123',
        })
      ).toThrow();
    });
  });

  describe('LoginSchema', () => {
    it('validates valid login payload', () => {
      const valid = {
        email: 'jane@example.com',
        password: 'password123',
      };
      const parsed = LoginSchema.parse(valid);
      expect(parsed.email).toBe('jane@example.com');
    });
  });

  describe('User JWT Token Signing and Verification', () => {
    it('signs and verifies a valid user token', () => {
      const payload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'developer@zyvan.dev',
        projectId: '223e4567-e89b-12d3-a456-426614174001',
      };

      const token = signUserToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyUserToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.projectId).toBe(payload.projectId);
    });

    it('returns null for an invalid or tampered token', () => {
      const invalid = 'eyJh.invalid.token';
      expect(verifyUserToken(invalid)).toBeNull();
    });
  });

  describe('Authorize Middleware', () => {
    it('allows user session tokens regardless of required scope', () => {
      const req: any = {
        auth: {
          type: 'user',
          userId: 'u_1',
          projectId: 'p_1',
          scopes: ['*'],
        },
      };
      const res: any = {
        status: (code: number) => ({ json: (data: any) => ({ code, data }) }),
      };
      let calledNext = false;
      const next = () => {
        calledNext = true;
      };

      const middleware = authorize('events:write', 'projects:manage');
      middleware(req, res, next);
      expect(calledNext).toBe(true);
    });

    it('checks granular scopes for api_key type', () => {
      const req: any = {
        auth: {
          type: 'api_key',
          apiKeyId: 'k_1',
          projectId: 'p_1',
          scopes: ['events:read'],
        },
      };
      let statusCode = 0;
      let errorResponse: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              errorResponse = data;
            },
          };
        },
      };
      let calledNext = false;
      const next = () => {
        calledNext = true;
      };

      const middleware = authorize('events:write');
      middleware(req, res, next);
      expect(calledNext).toBe(false);
      expect(statusCode).toBe(403);
      expect(errorResponse?.code).toBe('authorization_denied');
    });
  });
});
