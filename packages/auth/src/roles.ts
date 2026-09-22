// ─────────────────────────────────────────────────────────────
// Zyvan Auth — Organization Roles
// ─────────────────────────────────────────────────────────────

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const VALID_ROLES: Role[] = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.MEMBER,
  ROLES.VIEWER,
];

export function isValidRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}
