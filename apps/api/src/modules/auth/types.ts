// ─────────────────────────────────────────────────────────────
// Zyvan API — Auth Types
// Re-exports unified AuthContext from @zyvan/types and augments Express.
// ─────────────────────────────────────────────────────────────

import type { AuthContext, Role, Permission } from '@zyvan/types';
import type { Organization, Member, User } from '@zyvan/db';

export type { AuthContext, Role, Permission };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      organization?: Organization;
      membership?: Member;
      currentUser?: User;
      requestId: string;
    }
  }
}
