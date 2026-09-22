// ─────────────────────────────────────────────────────────────
// Zyvan API — Bootstrap Routes
// POST /v1/bootstrap — Create initial organization, project, & API key
//
// This endpoint is UNPROTECTED and only works when zero
// projects exist.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '@zyvan/db';
import { generateApiKey, hashApiKey } from '@zyvan/crypto';
import { config } from '../../config';
import { logger } from '../../lib/logger';
import { API_KEY_SCOPES } from '@zyvan/validation';

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
    const orgName = req.body?.orgName || 'Default Organization';

    // Generate the first API key
    const { key, prefix } = generateApiKey();
    const pepper = config.apiKeyPepper || process.env.API_KEY_PEPPER || 'zyvan_dev_pepper';
    const keyHash = hashApiKey(key, pepper);

    // Create organization + project + API key in a single transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const org = await tx.organization.create({
        data: {
          id: uuidv4(),
          name: orgName,
          slug: 'default-org',
        },
      });

      const project = await tx.project.create({
        data: {
          organizationId: org.id,
          name: projectName,
          plan: 'free',
          status: 'active',
        },
      });

      const apiKey = await tx.apiKey.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          keyHash,
          keyPrefix: prefix,
          name: 'Bootstrap Key',
          scopes: [...API_KEY_SCOPES], // Full access
        },
      });

      return { org, project, apiKey };
    });

    logger.info(
      { organizationId: result.org.id, projectId: result.project.id },
      '🚀 Bootstrap complete — first organization, project, and API key created'
    );

    res.status(201).json({
      organization: {
        id: result.org.id,
        name: result.org.name,
      },
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
