// ─────────────────────────────────────────────────────────────
// Zyvan API — Auth Types
// Defines the authentication context attached to every
// authenticated request after API key validation.
// ─────────────────────────────────────────────────────────────

/**
 * AuthContext is attached to req.auth after the authenticate middleware
 * successfully validates an API key. All downstream handlers can rely
 * on this context for authorization checks.
 */
export interface AuthContext {
  projectId: string;
  apiKeyId: string;
  scopes: string[];
}

// Extend Express Request to carry auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
