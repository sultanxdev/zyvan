import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../config/db';
import { authMiddleware } from '../../middleware/auth';

export const keysRouter = Router();

// All key management routes require authentication
keysRouter.use(authMiddleware);

// ── Validation ─────────────────────────────────────────────────────────

const CreateKeySchema = z.object({
    name: z.string().max(100).optional(),
});

// ── POST /v1/api-keys — Generate a new API key ─────────────────────────

keysRouter.post(
    '/',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = CreateKeySchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: parsed.error.flatten().fieldErrors,
                });
                return;
            }

            // Generate raw key in format: zv_live_<48 hex chars>
            const rawKey = `zv_live_${crypto.randomBytes(24).toString('hex')}`;
            const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
            const prefix = rawKey.slice(0, 12); // "zv_live_xxxx"

            const apiKey = await db.apiKey.create({
                data: {
                    keyHash,
                    prefix,
                    name: parsed.data.name ?? null,
                    isActive: true,
                },
            });

            // Return the raw key ONLY on creation — it's not stored and can never be retrieved
            res.status(201).json({
                id: apiKey.id,
                key: rawKey,        // ← shown ONCE only — user must copy this
                prefix: apiKey.prefix,
                name: apiKey.name,
                is_active: apiKey.isActive,
                created_at: apiKey.createdAt,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /v1/api-keys — List all API keys (no plaintext ever) ──────────

keysRouter.get(
    '/',
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const keys = await db.apiKey.findMany({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    prefix: true,
                    name: true,
                    isActive: true,
                    createdAt: true,
                    lastUsedAt: true,
                    // keyHash intentionally excluded
                },
            });

            res.json({ data: keys, count: keys.length });
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /v1/api-keys/:id — Get a single key's metadata ────────────────

keysRouter.get(
    '/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const key = await db.apiKey.findUnique({
                where: { id: req.params.id },
                select: {
                    id: true,
                    prefix: true,
                    name: true,
                    isActive: true,
                    createdAt: true,
                    lastUsedAt: true,
                },
            });

            if (!key) {
                res.status(404).json({ error: 'API key not found' });
                return;
            }

            res.json(key);
        } catch (err) {
            next(err);
        }
    }
);

// ── DELETE /v1/api-keys/:id — Revoke a key (soft delete) ────────────

keysRouter.delete(
    '/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const key = await db.apiKey.findUnique({
                where: { id: req.params.id },
                select: { id: true, isActive: true },
            });

            if (!key) {
                res.status(404).json({ error: 'API key not found' });
                return;
            }

            if (!key.isActive) {
                res.status(409).json({ error: 'API key is already revoked' });
                return;
            }

            await db.apiKey.update({
                where: { id: req.params.id },
                data: { isActive: false },
            });

            res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
);
