// ─────────────────────────────────────────────────────────────
// Zyvan API — Tenant Controller
// HTTP request parsing, validation, and response formatting
// for tenant management endpoints.
// ─────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { CreateTenantSchema, UpdateTenantSchema } from '@zyvan/schemas';
import * as tenantService from './service';

/**
 * POST /v1/tenants
 * Create a new tenant in the authenticated project.
 */
export async function createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateTenantSchema.parse(req.body);

    const tenant = await tenantService.createTenant(
      req.auth!.projectId,
      parsed.externalId,
      parsed.name,
      parsed.concurrencyLimit,
      parsed.rateLimit
    );

    res.status(201).json({ data: tenant });
  } catch (err: any) {
    // Handle duplicate tenant conflict
    if (err.code === 'conflict') {
      res.status(409).json({
        code: 'conflict',
        message: err.message,
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }
    next(err);
  }
}

/**
 * GET /v1/tenants
 * List all tenants in the authenticated project.
 */
export async function listTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenants = await tenantService.listTenants(req.auth!.projectId);
    res.json({ data: tenants });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /v1/tenants/:id
 * Get a single tenant by ID.
 */
export async function getTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenant = await tenantService.getTenant(req.params.id as string, req.auth!.projectId);

    if (!tenant) {
      res.status(404).json({
        code: 'not_found',
        message: 'Tenant not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /v1/tenants/:id
 * Update a tenant (name, limits, status).
 */
export async function updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = UpdateTenantSchema.parse(req.body);
    const tenant = await tenantService.updateTenant(req.params.id as string, req.auth!.projectId, parsed);

    if (!tenant) {
      res.status(404).json({
        code: 'not_found',
        message: 'Tenant not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data: tenant });
  } catch (err) {
    next(err);
  }
}
