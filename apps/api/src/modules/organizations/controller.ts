// ─────────────────────────────────────────────────────────────
// Zyvan API — Organization & Multi-Tenant Controller
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '@zyvan/db';
import { logAuditEvent } from '@zyvan/auth';
import type { Role } from '@zyvan/types';

/**
 * List all organizations the authenticated user belongs to.
 */
export async function listUserOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ code: 'authentication_required', message: 'User session required' });
      return;
    }

    const prisma = getPrismaClient();
    const memberships = await prisma.member.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      role: m.role,
      createdAt: m.organization.createdAt,
    }));

    res.json({ data: organizations });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new organization and assign the creator as 'owner'.
 */
export async function createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ code: 'authentication_required', message: 'User session required' });
      return;
    }

    const { name, slug } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ code: 'validation_error', message: 'Organization name is required' });
      return;
    }

    const prisma = getPrismaClient();
    const orgId = uuidv4();
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const org = await prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          id: orgId,
          name: name.trim(),
          slug: `${generatedSlug}-${Date.now().toString(36)}`,
        },
      });

      await tx.member.create({
        data: {
          id: uuidv4(),
          organizationId: createdOrg.id,
          userId,
          role: 'owner',
        },
      });

      return createdOrg;
    });

    await logAuditEvent({
      organizationId: org.id,
      userId,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: org.id,
      metadata: { name: org.name, slug: org.slug },
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });

    res.status(201).json({
      data: {
        ...org,
        role: 'owner',
      },
      message: 'Organization created successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get active organization details with statistics.
 */
export async function getOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.id || req.auth?.organizationId;
    if (!orgId) {
      res.status(400).json({ code: 'bad_request', message: 'Organization ID required' });
      return;
    }

    // Enforce tenant boundary: user cannot query an organization they are not in
    if (req.auth?.organizationId && req.auth.organizationId !== orgId) {
      res.status(403).json({ code: 'forbidden', message: 'Cross-tenant access forbidden' });
      return;
    }

    const prisma = getPrismaClient();
    const [organization, memberCount, projectCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
      }),
      prisma.member.count({ where: { organizationId: orgId } }),
      prisma.project.count({ where: { organizationId: orgId } }),
    ]);

    if (!organization) {
      res.status(404).json({ code: 'not_found', message: 'Organization not found' });
      return;
    }

    res.json({
      data: {
        ...organization,
        memberCount,
        projectCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all members of the organization.
 */
export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.id || req.auth?.organizationId;
    if (!orgId || orgId !== req.auth?.organizationId) {
      res.status(403).json({ code: 'forbidden', message: 'Cannot access members of another organization' });
      return;
    }

    const prisma = getPrismaClient();
    const members = await prisma.member.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      data: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Invite a new member by email.
 */
export async function inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.id || req.auth?.organizationId;
    const userId = req.auth?.userId;
    if (!orgId || !userId || orgId !== req.auth?.organizationId) {
      res.status(403).json({ code: 'forbidden', message: 'Cannot invite to another organization' });
      return;
    }

    const { email, role = 'member' } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ code: 'validation_error', message: 'Valid email is required' });
      return;
    }

    const validRoles: Role[] = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ code: 'validation_error', message: `Role must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const prisma = getPrismaClient();

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember) {
        res.status(409).json({ code: 'conflict', message: 'User is already a member of this organization' });
        return;
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        id: uuidv4(),
        organizationId: orgId,
        email,
        role,
        status: 'pending',
        expiresAt,
        inviterId: userId,
      },
    });

    await logAuditEvent({
      organizationId: orgId,
      userId,
      action: 'member.invited',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { email, role },
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });

    res.status(201).json({
      data: invitation,
      message: `Invitation sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a member's role.
 */
export async function updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.id || req.auth?.organizationId;
    const memberId = req.params.memberId;
    const { role } = req.body;

    if (!orgId || orgId !== req.auth?.organizationId) {
      res.status(403).json({ code: 'forbidden', message: 'Cannot modify members in another organization' });
      return;
    }

    const validRoles: Role[] = ['owner', 'admin', 'member', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ code: 'validation_error', message: `Role must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const prisma = getPrismaClient();
    const targetMember = await prisma.member.findUnique({ where: { id: memberId } });

    if (!targetMember || targetMember.organizationId !== orgId) {
      res.status(404).json({ code: 'not_found', message: 'Member not found in this organization' });
      return;
    }

    // Prevent removing the last owner
    if (targetMember.role === 'owner' && role !== 'owner') {
      const ownerCount = await prisma.member.count({
        where: { organizationId: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        res.status(400).json({ code: 'bad_request', message: 'Cannot demote the sole organization owner' });
        return;
      }
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { role },
    });

    await logAuditEvent({
      organizationId: orgId,
      userId: req.auth?.userId,
      action: 'member.role_changed',
      resourceType: 'member',
      resourceId: memberId,
      metadata: { previousRole: targetMember.role, newRole: role },
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });

    res.json({ data: updated, message: 'Member role updated' });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove a member from the organization.
 */
export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.params.id || req.auth?.organizationId;
    const memberId = req.params.memberId;

    if (!orgId || orgId !== req.auth?.organizationId) {
      res.status(403).json({ code: 'forbidden', message: 'Cannot remove members from another organization' });
      return;
    }

    const prisma = getPrismaClient();
    const targetMember = await prisma.member.findUnique({ where: { id: memberId } });

    if (!targetMember || targetMember.organizationId !== orgId) {
      res.status(404).json({ code: 'not_found', message: 'Member not found in this organization' });
      return;
    }

    // Prevent removing the sole owner
    if (targetMember.role === 'owner') {
      const ownerCount = await prisma.member.count({
        where: { organizationId: orgId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        res.status(400).json({ code: 'bad_request', message: 'Cannot remove the sole organization owner' });
        return;
      }
    }

    await prisma.member.delete({ where: { id: memberId } });

    await logAuditEvent({
      organizationId: orgId,
      userId: req.auth?.userId,
      action: 'member.removed',
      resourceType: 'member',
      resourceId: memberId,
      metadata: { removedUserId: targetMember.userId, role: targetMember.role },
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });

    res.json({ message: 'Member removed from organization' });
  } catch (err) {
    next(err);
  }
}
