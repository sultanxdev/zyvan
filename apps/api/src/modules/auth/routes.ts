// ─────────────────────────────────────────────────────────────
// Zyvan API — Auth Routes
// Endpoints for user signup, login, demo access, and profile.
// ─────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import { SignupSchema, LoginSchema } from '@zyvan/schemas';
import * as userService from './user-service';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

/**
 * POST /v1/auth/signup
 * Register a new user account.
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = SignupSchema.parse(req.body);
    const session = await userService.signup(parsed);
    res.status(201).json({
      data: session,
      message: 'Account created successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /v1/auth/login
 * Sign in with email and password.
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = LoginSchema.parse(req.body);
    const session = await userService.login(parsed);
    res.json({
      data: session,
      message: 'Signed in successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /v1/auth/demo
 * One-click demo sign-in for portfolio demonstration.
 */
router.post('/demo', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await userService.demoLogin();
    res.json({
      data: session,
      message: 'Demo signed in successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /v1/auth/me
 * Get current authenticated user profile & project list.
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.auth?.userId) {
      res.status(401).json({
        code: 'authentication_failed',
        message: 'Endpoint requires user session authentication',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    const data = await userService.getCurrentUser(req.auth.userId, req.auth.projectId);
    if (!data) {
      res.status(404).json({
        code: 'not_found',
        message: 'User profile not found',
        request_id: req.requestId || 'unknown',
        details: {},
      });
      return;
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export { router as authRoutes };
