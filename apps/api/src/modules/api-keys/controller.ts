// ─────────────────────────────────────────────────────────────
// Zyvan API — API Key Controller
// Handles HTTP request parsing, validation, and response
// formatting for API key operations.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateApiKeySchema } from '@zyvan/schemas';
import * as apiKeyService from './service';

/**
 * POST /v1/api-keys
 * Create a new API key for the authenticated project.
 *
 * ⚠️ The plaintext key is returned ONLY in this response.
 */
export async function createApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateApiKeySchema.parse(req.body);

    const result = await apiKeyService.createApiKey(
      req.auth!.projectId,
      parsed.name,
      parsed.scopes,
      parsed.expiresAt
    );

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
 * List all API keys for the authenticated project.
 * Keys are returned in safe format (no hash, no plaintext).
 */
export async function listApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const keys = await apiKeyService.listApiKeys(req.auth!.projectId);

    res.json({
      data: keys,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /v1/api-keys/:id
 * Revoke an API key. It remains in the database for audit
 * but will be rejected during authentication.
 */
export async function revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const revoked = await apiKeyService.revokeApiKey(req.params.id as string, req.auth!.projectId);

    if (!revoked) {
      res.status(404).json({
        code: 'not_found',
        message: 'API key not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({
      data: revoked,
      message: 'API key revoked successfully',
    });
  } catch (err) {
    next(err);
  }
}
