// ─────────────────────────────────────────────────────────────
// Zyvan API — User Authentication Service
// Handles user signup, login, demo authentication, and session JWTs.
// ─────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '@zyvan/database';
import { generateApiKey, hashApiKey } from '@zyvan/crypto';
import { API_KEY_SCOPES } from '@zyvan/schemas';
import type { SignupInput, LoginInput } from '@zyvan/schemas';
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
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
    issuer: 'zyvan-api',
  });
}

/**
 * Verify and decode a JWT session token.
 */
export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'zyvan-api',
    }) as UserTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Register a new user account with default project, membership, tenant, and API key.
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
  const keyHash = hashApiKey(key, config.apiKeyPepper);

  const result = await prisma.$transaction(async (tx: any) => {
    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(input.email)}`,
        role: 'member',
      },
    });

    const project = await tx.project.create({
      data: {
        name: `${input.name}'s Project`,
        plan: 'scale',
        status: 'active',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    // Default tenant for immediate webhook ingestion
    await tx.tenant.create({
      data: {
        projectId: project.id,
        externalId: 'tenant_default',
        name: 'Default Tenant',
        concurrencyLimit: 10,
        rateLimit: 100,
        status: 'active',
      },
    });

    // Initial root API key
    const apiKey = await tx.apiKey.create({
      data: {
        projectId: project.id,
        keyHash,
        keyPrefix: prefix,
        name: 'Default Ingestion Key',
        scopes: [...API_KEY_SCOPES],
      },
    });

    return { user, project, apiKey };
  });

  const token = signUserToken({
    userId: result.user.id,
    email: result.user.email,
    projectId: result.project.id,
  });

  logger.info({ userId: result.user.id, projectId: result.project.id }, 'User registered successfully');

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      avatar: result.user.avatar,
      role: result.user.role,
      createdAt: result.user.createdAt,
    },
    token,
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
      memberships: {
        include: {
          project: true,
        },
      },
      ownedProjects: true,
    },
  });

  if (!user) {
    const err = new Error('Invalid email or password');
    (err as any).code = 'authentication_failed';
    (err as any).statusCode = 401;
    throw err;
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    const err = new Error('Invalid email or password');
    (err as any).code = 'authentication_failed';
    (err as any).statusCode = 401;
    throw err;
  }

  // Find user's active project (first owned or membership project)
  let project = user.memberships[0]?.project || user.ownedProjects[0];

  if (!project) {
    // Auto-create a project if somehow none exists
    project = await prisma.project.create({
      data: {
        name: `${user.name}'s Project`,
        plan: 'scale',
        status: 'active',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
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
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
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
 * Automatically provisions the demo account and pre-seeds a tenant if not already existing.
 */
export async function demoLogin(): Promise<AuthSessionResponse> {
  const prisma = getPrismaClient();
  const demoEmail = 'developer@zyvan.dev';

  let user = await prisma.user.findUnique({
    where: { email: demoEmail },
    include: {
      memberships: {
        include: { project: true },
      },
      ownedProjects: true,
    },
  });

  if (!user) {
    return signup({
      name: 'Zyvan Developer',
      email: demoEmail,
      password: 'zyvan_secure_2026',
    });
  }

  let project = user.memberships[0]?.project || user.ownedProjects[0];
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Default Production Project',
        plan: 'scale',
        status: 'active',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });
  }

  // Ensure default tenant exists
  const tenant = await prisma.tenant.findFirst({
    where: { projectId: project.id, externalId: 'tenant_default' },
  });
  if (!tenant) {
    await prisma.tenant.create({
      data: {
        projectId: project.id,
        externalId: 'tenant_default',
        name: 'Default Tenant',
        concurrencyLimit: 10,
        rateLimit: 100,
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
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
    project: {
      id: project.id,
      name: project.name,
      plan: project.plan,
      status: project.status,
    },
  };
}

/**
 * Fetch current authenticated user profile and all accessible projects.
 */
export async function getCurrentUser(userId: string, currentProjectId?: string) {
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          project: true,
        },
      },
      ownedProjects: true,
    },
  });

  if (!user) {
    return null;
  }

  // Combine owned projects and member projects
  const projectsMap = new Map<string, any>();
  for (const op of user.ownedProjects) {
    projectsMap.set(op.id, op);
  }
  for (const m of user.memberships) {
    if (!projectsMap.has(m.project.id)) {
      projectsMap.set(m.project.id, m.project);
    }
  }

  const projects = Array.from(projectsMap.values());
  const activeProject = currentProjectId
    ? projects.find((p) => p.id === currentProjectId) || projects[0]
    : projects[0];

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
    },
    activeProject: activeProject || null,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      plan: p.plan,
      status: p.status,
    })),
  };
}
