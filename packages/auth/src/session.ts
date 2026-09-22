// ─────────────────────────────────────────────────────────────
// Zyvan Auth — Session Helpers
// ─────────────────────────────────────────────────────────────

import { auth } from './auth';
import type { UserSession } from '@zyvan/types';

/**
 * Validate and retrieve a session from standard incoming headers.
 */
export async function getSessionFromHeaders(headers: Headers): Promise<UserSession | null> {
  const session = await auth.api.getSession({
    headers,
  });

  if (!session || !session.user) {
    return null;
  }

  return session as unknown as UserSession;
}
