// ─────────────────────────────────────────────────────────────
// Zyvan API — User Authentication Service
// Multi-tenant user signup, login, demo authentication, and session JWTs.
// Uses Better Auth schema models (User, Account, Organization, Member).
// ─────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '@zyvan/db';
import { generateApiKey, hashApiKey } from '@zyvan/crypto';
import { API_KEY_SCOPES } from '@zyvan/validation';
import type { SignupInput, LoginInput } from '@zyvan/validation';
import { config } from '../../config';
import { logger } from '../../lib/logger';

export interface AuthSessionResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    role: string;
    createdAt: Date;
  };
  token: string;
  project: {
    id: string;
    name: string;
    plan: string;
    status: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  apiKey?: {
    id: string;
    key: string;
    keyPrefix: string;
    name: string;
  };
}

export interface UserTokenPayload {
  userId: string;
  email: string;
  projectId: string;
}

/**
 * Generate a signed JWT session token for a dashboard user.
 */
export function signUserToken(payload: UserTokenPayload): string {
  const secret = config.jwtSecret || process.env.BETTER_AUTH_SECRET || 'zyvan_dev_jwt_secret_minimum_32_chars';
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
    issuer: 'zyvan-api',
  });
}

/**
 * Verify and decode a JWT session token.
 */
export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    const secret = config.jwtSecret || process.env.BETTER_AUTH_SECRET || 'zyvan_dev_jwt_secret_minimum_32_chars';
    const decoded = jwt.verify(token, secret, {
      issuer: 'zyvan-api',
    }) as UserTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Register a new user account with default organization, member, project, and API key.
 */
export async function signup(input: SignupInput): Promise<AuthSessionResponse> {
  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existing) {
    const err = new Error('An account with this email address already exists');
    (err as any).code = 'conflict';
    (err as any).statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const { key, prefix } = generateApiKey();
  const pepper = config.apiKeyPepper || process.env.API_KEY_PEPPER || 'zyvan_dev_pepper';
  const keyHash = hashApiKey(key, pepper);

  const userId = uuidv4();
  const orgId = uuidv4();
  const accountId = uuidv4();

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Create User
    const user = await tx.user.create({
      data: {
        id: userId,
        email: input.email.toLowerCase(),
        name: input.name,
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(input.email)}`,
        emailVerified: true,
      },
    });

    // 2. Create Credential Account for password auth
    await tx.account.create({
      data: {
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId: user.id,
        password: passwordHash,
      },
    });

    // 3. Create Default Organization
    const organization = await tx.organization.create({
      data: {
        id: orgId,
        name: `${input.name}'s Organization`,
        slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
      },
    });

    // 4. Create Owner Membership
    const member = await tx.member.create({
      data: {
        id: uuidv4(),
        organizationId: organization.id,
        userId: user.id,
        role: 'owner',
      },
    });

    // 5. Create Default Project
    const project = await tx.project.create({
      data: {
        organizationId: organization.id,
        name: `${input.name}'s Project`,
        plan: 'scale',
        status: 'active',
      },
    });

    // 6. Initial Root API Key
    const apiKey = await tx.apiKey.create({
      data: {
        organizationId: organization.id,
        projectId: project.id,
        keyHash,
        keyPrefix: prefix,
        name: 'Default Ingestion Key',
        scopes: [...API_KEY_SCOPES],
      },
    });

    return { user, organization, member, project, apiKey };
  });

  const token = signUserToken({
    userId: result.user.id,
    email: result.user.email,
    projectId: result.project.id,
  });

  logger.info({ userId: result.user.id, organizationId: result.organization.id }, 'User registered successfully');

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      avatar: result.user.image,
      role: 'owner',
      createdAt: result.user.createdAt,
    },
    token,
    organization: {
      id: result.organization.id,
      name: result.organization.name,
    },
    project: {
      id: result.project.id,
      name: result.project.name,
      plan: result.project.plan,
      status: result.project.status,
    },
    apiKey: {
      id: result.apiKey.id,
      key,
      keyPrefix: result.apiKey.keyPrefix,
      name: result.apiKey.name,
    },
  };
}

/**
 * Authenticate an existing user with email and password.
 */
export async function login(input: LoginInput): Promise<AuthSessionResponse> {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      accounts: { where: { providerId: 'credential' } },
      members: {
        include: {
          organization: {
            include: {
              projects: true,
            },
          },
        },
      },
    },
  });

  if (!user || user.accounts.length === 0 || !user.accounts[0].password) {
    const err = new Error('Invalid email or password');
    (err as any).code = 'authentication_failed';
    (err as any).statusCode = 401;
    throw err;
  }

  const validPassword = await bcrypt.compare(input.password, user.accounts[0].password);
  if (!validPassword) {
    const err = new Error('Invalid email or password');
    (err as any).code = 'authentication_failed';
    (err as any).statusCode = 401;
    throw err;
  }

  const primaryMember = user.members[0];
  let organization = primaryMember?.organization;
  let project = organization?.projects[0];

  if (!organization) {
    // Auto-create default organization if missing
    organization = await prisma.organization.create({
      data: {
        id: uuidv4(),
        name: `${user.name}'s Organization`,
        slug: `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
      },
      include: { projects: true },
    });

    await prisma.member.create({
      data: {
        id: uuidv4(),
        organizationId: organization.id,
        userId: user.id,
        role: 'owner',
      },
    });
  }

  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: `${user.name}'s Project`,
        plan: 'scale',
        status: 'active',
      },
    });
  }

  const token = signUserToken({
    userId: user.id,
    email: user.email,
    projectId: project.id,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.image,
      role: primaryMember?.role || 'owner',
      createdAt: user.createdAt,
    },
    token,
    organization: {
      id: organization.id,
      name: organization.name,
    },
    project: {
      id: project.id,
      name: project.name,
      plan: project.plan,
      status: project.status,
    },
  };
}

/**
 * Instant demo login for portfolio reviewers and testing.
 */
export async function demoLogin(): Promise<AuthSessionResponse> {
  const prisma = getPrismaClient();
  const demoEmail = 'developer@zyvan.dev';

  const user = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!user) {
    return signup({
      name: 'Zyvan Developer',
      email: demoEmail,
      password: 'zyvan_secure_2026',
    });
  }

  return login({
    email: demoEmail,
    password: 'zyvan_secure_2026',
  });
}

/**
 * Fetch current authenticated user profile and all accessible projects.
 */
export async function getCurrentUser(userId: string, currentProjectId?: string) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      members: {
        include: {
          organization: {
            include: {
              projects: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const organizations = user.members.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  const allProjects = user.members.flatMap((m) => m.organization.projects);
  const activeProject = currentProjectId
    ? allProjects.find((p) => p.id === currentProjectId) || allProjects[0]
    : allProjects[0];

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.image,
      role: user.members[0]?.role || 'member',
      createdAt: user.createdAt,
    },
    activeProject: activeProject || null,
    organizations,
    projects: allProjects.map((p) => ({
      id: p.id,
      name: p.name,
      plan: p.plan,
      status: p.status,
    })),
  };
}
