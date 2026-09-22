// ─────────────────────────────────────────────────────────────
// Zyvan Auth — Centralized Permission Matrix & RBAC
// ─────────────────────────────────────────────────────────────

import { ROLES, Role } from './roles';
import { Resource, Action } from '@zyvan/types';

export interface PermissionStatement {
  resource: Resource;
  action: Action;
}

/**
 * Explicit permission matrix mapping each organization-scoped Role
 * to permitted (resource, action) pairs.
 */
const ROLE_PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  [ROLES.OWNER]: {
    organization: ['read', 'create', 'update', 'delete', 'manage'],
    member: ['read', 'create', 'update', 'delete', 'manage'],
    project: ['read', 'create', 'update', 'delete', 'manage'],
    destination: ['read', 'create', 'update', 'delete', 'manage'],
    event: ['read', 'create', 'update', 'delete', 'manage'],
    delivery: ['read', 'replay', 'manage'],
    apiKey: ['read', 'create', 'update', 'delete', 'manage'],
    auditLog: ['read'],
  },
  [ROLES.ADMIN]: {
    organization: ['read', 'update'],
    member: ['read', 'create', 'update', 'delete'],
    project: ['read', 'create', 'update', 'delete'],
    destination: ['read', 'create', 'update', 'delete'],
    event: ['read', 'create'],
    delivery: ['read', 'replay'],
    apiKey: ['read', 'create', 'delete'],
    auditLog: ['read'],
  },
  [ROLES.MEMBER]: {
    organization: ['read'],
    member: ['read'],
    project: ['read', 'create', 'update'],
    destination: ['read', 'create', 'update'],
    event: ['read', 'create'],
    delivery: ['read', 'replay'],
    apiKey: ['read', 'create'],
    auditLog: ['read'],
  },
  [ROLES.VIEWER]: {
    organization: ['read'],
    member: ['read'],
    project: ['read'],
    destination: ['read'],
    event: ['read'],
    delivery: ['read'],
    apiKey: ['read'],
    auditLog: ['read'],
  },
};

/**
 * Centralized authorization evaluation function.
 * Evaluates whether an organization-scoped role has permission for an action on a resource.
 */
export function hasPermission(role: Role, resource: Resource, action: Action): boolean {
  const resourcePermissions = ROLE_PERMISSIONS[role]?.[resource];
  if (!resourcePermissions) return false;

  // 'manage' grants all actions on that resource
  if (resourcePermissions.includes('manage')) return true;

  return resourcePermissions.includes(action);
}

/**
 * Helper to assert permission or throw typed error.
 */
export function assertPermission(role: Role, resource: Resource, action: Action): void {
  if (!hasPermission(role, resource, action)) {
    const error = new Error(`Forbidden: Role '${role}' lacks permission to '${action}' on resource '${resource}'`);
    (error as any).statusCode = 403;
    (error as any).code = 'authorization_denied';
    throw error;
  }
}
