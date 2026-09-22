// ─────────────────────────────────────────────────────────────
// Zyvan Auth — Security Audit Logging Service
// ─────────────────────────────────────────────────────────────

import { getPrismaClient } from '@zyvan/db';
import { logger } from '@zyvan/logger';

export interface AuditLogParams {
  organizationId: string;
  userId?: string | null;
  action:
    | 'organization.created'
    | 'organization.updated'
    | 'member.invited'
    | 'member.removed'
    | 'member.role_changed'
    | 'api_key.created'
    | 'api_key.revoked'
    | 'project.created'
    | 'project.deleted'
    | 'destination.created'
    | 'destination.deleted'
    | 'delivery.replayed';
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  const prisma = getPrismaClient();

  // Sanitize metadata to ensure no credentials or raw secrets are logged
  const sanitizedMetadata = { ...params.metadata };
  delete sanitizedMetadata.password;
  delete sanitizedMetadata.secret;
  delete sanitizedMetadata.apiKey;
  delete sanitizedMetadata.rawKey;

  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: sanitizedMetadata,
        ipAddress: params.ipAddress,
      },
    });

    logger.info(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resourceId: params.resourceId,
      },
      `Audit Log: ${params.action}`
    );
  } catch (err) {
    logger.error({ err, action: params.action }, 'Failed to record audit log');
  }
}
