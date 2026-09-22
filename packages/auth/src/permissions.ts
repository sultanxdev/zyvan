// ─────────────────────────────────────────────────────────────
// Zyvan Auth — Centralized Permission Matrix & RBAC
// ─────────────────────────────────────────────────────────────

import { ROLES, Role } from './roles';
import { Resource, BaseResource, Action } from '@zyvan/types';

export interface PermissionStatement {
  resource: Resource;
  action: Action;
}

export function normalizeResource(resource: Resource): BaseResource {
  switch (resource) {
    case 'organizations':
    case 'organization':
      return 'organization';
    case 'members':
    case 'member':
      return 'member';
    case 'projects':
    case 'project':
      return 'project';
    case 'destinations':
    case 'destination':
      return 'destination';
    case 'events':
    case 'event':
      return 'event';
    case 'deliveries':
    case 'delivery':
    case 'replay':
      return 'delivery';
    case 'api_keys':
    case 'api_key':
    case 'api-keys':
    case 'apiKey':
      return 'apiKey';
    case 'audit_logs':
    case 'audit_log':
    case 'auditLog':
      return 'auditLog';
    case 'usage':
      return 'project';
    default:
      return resource as BaseResource;
  }
}

/**
 * Explicit permission matrix mapping each organization-scoped Role
 * to permitted (resource, action) pairs.
 */
const ROLE_PERMISSIONS: Record<Role, Record<BaseResource, Action[]>> = {
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
  const normalized = normalizeResource(resource);
  const resourcePermissions = ROLE_PERMISSIONS[role]?.[normalized];
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

/**
 * Returns all permission strings formatted as `${resource}:${action}` for a role.
 */
export function getRolePermissions(role: Role): string[] {
  const roleMap = ROLE_PERMISSIONS[role];
  if (!roleMap) return [];

  const permissions: string[] = [];
  for (const [res, actions] of Object.entries(roleMap)) {
    for (const act of actions) {
      permissions.push(`${res}:${act}`);
    }
  }
  return permissions;
}
