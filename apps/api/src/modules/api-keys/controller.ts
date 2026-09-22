// ─────────────────────────────────────────────────────────────
// Zyvan API — API Key Controller
// Scoped strictly to caller's Organization with RBAC audit logs.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateApiKeySchema } from '@zyvan/validation';
import { logAuditEvent } from '@zyvan/auth';
import * as apiKeyService from './service';

/**
 * POST /v1/api-keys
 * Create a new API key for a project within caller's organization.
 */
export async function createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const parsed = CreateApiKeySchema.parse(req.body);

    const projectId = (req.body.projectId as string) || (req.auth as any).projectId;
    if (!projectId) {
      res.status(400).json({
        code: 'bad_request',
        message: 'projectId is required to generate an API key',
        request_id: req.requestId || 'unknown',
      });
      return;
    }

    const result = await apiKeyService.createApiKey(
      orgId,
      projectId,
      parsed.name,
      parsed.scopes,
      parsed.expiresAt
    );

    await logAuditEvent({
      organizationId: orgId,
      userId: req.auth?.userId,
      action: 'api_key.created',
      resourceType: 'api_key',
      resourceId: result.apiKey.id,
      metadata: { name: result.apiKey.name, keyPrefix: result.apiKey.keyPrefix, projectId },
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });

    res.status(201).json({
      key: result.key,
      api_key: result.apiKey,
      warning: 'This key will only be shown once. Store it securely.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/api-keys
 * List all API keys for caller's organization.
 */
export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const projectId = (req.query.projectId as string) || (req.auth as any).projectId;
    const keys = await apiKeyService.listApiKeys(orgId, projectId);

    res.json({
      data: keys,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /v1/api-keys/:id
 * Revoke an API key within caller's organization.
 */
export async function revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.auth!.organizationId;
    const keyId = req.params.id as string;
    const revoked = await apiKeyService.revokeApiKey(keyId, orgId);

    if (!revoked) {
      res.status(404).json({
        code: 'not_found',
        message: 'API key not found in this organization',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    await logAuditEvent({
      organizationId: orgId,
      userId: req.auth?.userId,
      action: 'api_key.revoked',
      resourceType: 'api_key',
      resourceId: keyId,
      metadata: { name: revoked.name, keyPrefix: revoked.keyPrefix },
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });

    res.json({
      data: revoked,
      message: 'API key revoked successfully',
    });
  } catch (err) {
    next(err);
  }
}
