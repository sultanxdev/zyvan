// ─────────────────────────────────────────────────────────────
// Zyvan Auth — Better Auth Server Instance
// Configured with Prisma Adapter, Organization Plugin,
// Email/Password, Google OAuth, and GitHub OAuth.
// ─────────────────────────────────────────────────────────────

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { getPrismaClient } from '@zyvan/db';
import { getEnv } from '@zyvan/config';

const env = getEnv();
const prisma = getPrismaClient();

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID || '',
      clientSecret: env.GITHUB_CLIENT_SECRET || '',
      enabled: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
      enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: 'owner',
    }),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    },
  },
  trustedOrigins: [
    env.CLIENT_ORIGIN,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
});

export type Auth = typeof auth;
