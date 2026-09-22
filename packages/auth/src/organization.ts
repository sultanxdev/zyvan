// ─────────────────────────────────────────────────────────────
// Zyvan Auth — Organization & Tenant Validation
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import { Role } from './roles';

export interface OrgMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  organization: {
    id: string;
    name: string;
    slug: string | null;
  };
}

/**
 * Validate that a user belongs to an organization.
 * Returns the membership record if valid, null otherwise.
 * Prevents BOLA / IDOR attacks.
 */
export async function getOrganizationMembership(
  organizationId: string,
  userId: string
): Promise<OrgMembership | null> {
  const prisma = getPrismaClient();

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role as Role,
    organization: member.organization,
  };
}

/**
 * List all organizations accessible to a user.
 */
export async function listUserOrganizations(userId: string) {
  const prisma = getPrismaClient();

  const members = await prisma.member.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return members.map((m) => ({
    organization: m.organization,
    role: m.role as Role,
    joinedAt: m.createdAt,
  }));
}
