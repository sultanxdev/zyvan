// ─────────────────────────────────────────────────────────────
// Zyvan Types Package — Shared Domain, Auth, and Webhook Types
// ─────────────────────────────────────────────────────────────

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const RESOURCES = {
  ORGANIZATION: 'organization',
  MEMBER: 'member',
  PROJECT: 'project',
  DESTINATION: 'destination',
  EVENT: 'event',
  DELIVERY: 'delivery',
  API_KEY: 'apiKey',
  AUDIT_LOG: 'auditLog',
} as const;

export type Resource =
  | 'organization' | 'organizations'
  | 'member' | 'members'
  | 'project' | 'projects'
  | 'destination' | 'destinations'
  | 'event' | 'events'
  | 'delivery' | 'deliveries'
  | 'apiKey' | 'api_key' | 'api_keys' | 'api-keys'
  | 'auditLog' | 'audit_log' | 'audit_logs'
  | 'replay'
  | 'usage';

export const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REPLAY: 'replay',
  MANAGE: 'manage',
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];

export interface PermissionStatement {
  resource: Resource;
  action: Action;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    activeOrganizationId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string | null;
  role: Role;
}

export interface ApiKeyContext {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
}

export interface BaseAuthContext {
  type: 'session' | 'api_key' | 'user';
  organizationId: string;
}

export interface UserAuthContext extends BaseAuthContext {
  type: 'session' | 'user';
  userId: string;
  userEmail: string;
  userName?: string | null;
  role: Role;
  permissions: string[];
  projectId?: string;
  user?: UserSession['user'];
  organization?: OrganizationContext;
  scopes?: string[];
}

export interface ApiKeyAuthContext extends BaseAuthContext {
  type: 'api_key';
  apiKeyId: string;
  projectId: string;
  scopes: string[];
  keyPrefix: string;
  role?: Role;
  userId?: string;
  userEmail?: string;
  permissions?: string[];
}

export type AuthContext = UserAuthContext | ApiKeyAuthContext;

export type Permission = `${Resource}:${Action}` | '*';
