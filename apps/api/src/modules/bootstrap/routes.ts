// ─────────────────────────────────────────────────────────────
// Zyvan API — Bootstrap Routes
// POST /v1/bootstrap — Create the first project + API key
//
// This endpoint is UNPROTECTED and only works when zero
// projects exist. It solves the chicken-and-egg problem:
// you need an API key to create a project, but you need
// a project to create an API key.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import { getPrismaClient, PrismaClient } from '@zyvan/database';
import { generateApiKey, hashApiKey } from '@zyvan/crypto';
import { config } from '../../config';
import { logger } from '../../lib/logger';
import { API_KEY_SCOPES } from '@zyvan/schemas';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = getPrismaClient();

    // Only allow bootstrap when no projects exist
    const projectCount = await prisma.project.count();
    if (projectCount > 0) {
      res.status(409).json({
        code: 'conflict',
        message: 'Bootstrap has already been completed. Use your API key to manage resources.',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    const projectName = req.body?.name || 'Default Project';

    // Generate the first API key
    const { key, prefix } = generateApiKey();
    const keyHash = hashApiKey(key, config.apiKeyPepper);

    // Create project + API key in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: projectName,
          plan: 'free',
          status: 'active',
        },
      });

      const apiKey = await tx.apiKey.create({
        data: {
          projectId: project.id,
          keyHash,
          keyPrefix: prefix,
          name: 'Bootstrap Key',
          scopes: [...API_KEY_SCOPES], // Full access
        },
      });

      return { project, apiKey };
    });

    logger.info(
      { projectId: result.project.id },
      '🚀 Bootstrap complete — first project and API key created'
    );

    res.status(201).json({
      project: {
        id: result.project.id,
        name: result.project.name,
        plan: result.project.plan,
        status: result.project.status,
        created_at: result.project.createdAt,
      },
      api_key: {
        id: result.apiKey.id,
        key_prefix: result.apiKey.keyPrefix,
        name: result.apiKey.name,
        scopes: result.apiKey.scopes,
      },
      key: key,
      warning: 'Save this API key now. It will never be shown again.',
    });
  } catch (err) {
    next(err);
  }
});

export { router as bootstrapRoutes };
