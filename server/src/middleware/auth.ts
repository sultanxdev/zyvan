import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../config/db';

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const rawKey = req.headers['x-api-key'] as string | undefined;

    if (!rawKey) {
        res.status(401).json({ error: 'Missing x-api-key header' });
        return;
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await db.apiKey.findUnique({ where: { keyHash } });

    if (!apiKey || !apiKey.isActive) {
        res.status(401).json({ error: 'Invalid or revoked API key' });
        return;
    }

    // Fire-and-forget: update lastUsedAt without blocking the request
    db.apiKey
        .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
        .catch(() => { });

    next();
}
