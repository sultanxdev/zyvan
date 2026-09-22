'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from './auth-client';
import { apiClient, OrganizationInfo } from './api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'github' | 'email';
  role?: string;
  createdAt: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'disabled';
}

export type { OrganizationInfo };

interface AuthContextType {
  user: User | null;
  organization: OrganizationInfo | null;
  organizations: OrganizationInfo[];
  project: ProjectInfo | null;
  token: string | null;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  loginWithDemo: () => Promise<void>;
  logout: () => Promise<void> | void;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string, slug: string) => Promise<OrganizationInfo>;
  switchProject: (project: ProjectInfo) => void;
  refreshSession: () => Promise<void>;
}

const DEFAULT_PROJECT: ProjectInfo = {
  id: '0198fa72-91bc-7123-8819-0012891fa120',
  name: 'Default Production Project',
  plan: 'scale',
  status: 'active',
};

const DEFAULT_ORG: OrganizationInfo = {
  id: 'org_default',
  name: 'Acme Corp',
  slug: 'acme-corp',
  role: 'OWNER',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(DEFAULT_ORG);
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([DEFAULT_ORG]);
  const [project, setProject] = useState<ProjectInfo | null>(DEFAULT_PROJECT);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const saveSession = useCallback(
    (newUser: User, newToken?: string, newProject?: ProjectInfo, newOrg?: OrganizationInfo) => {
      setUser(newUser);
      if (newToken) {
        setToken(newToken);
        apiClient.setAuthToken(newToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('zyvan_token', newToken);
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('zyvan_user', JSON.stringify(newUser));
      }

      const targetProject = newProject || project || DEFAULT_PROJECT;
      setProject(targetProject);
      apiClient.setProjectId(targetProject.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('zyvan_project', JSON.stringify(targetProject));
      }

      if (newOrg) {
        setOrganization(newOrg);
        apiClient.setOrganizationId(newOrg.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('zyvan_active_org_id', newOrg.id);
          localStorage.setItem('zyvan_organization', JSON.stringify(newOrg));
        }
      }
    },
    [project]
  );

  // Refresh session and organizations from Better Auth backend
  const refreshSession = useCallback(async () => {
    try {
      // 1. Try Better Auth getSession
      const sessionRes = await authClient.getSession();
      if (sessionRes?.data?.user) {
        const u = sessionRes.data.user;
        const refreshedUser: User = {
          id: u.id,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          avatar:
            u.image ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.email)}`,
          provider: 'email',
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        };
        setUser(refreshedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('zyvan_user', JSON.stringify(refreshedUser));
        }

        // Fetch Organizations list
        try {
          const orgs = await apiClient.listOrganizations();
          if (orgs && orgs.length > 0) {
            setOrganizations(orgs);
            const activeId =
              typeof window !== 'undefined' ? localStorage.getItem('zyvan_active_org_id') : null;
            const currentOrg = orgs.find((o) => o.id === activeId) || orgs[0];
            setOrganization(currentOrg);
            apiClient.setOrganizationId(currentOrg.id);
            if (typeof window !== 'undefined') {
              localStorage.setItem('zyvan_active_org_id', currentOrg.id);
              localStorage.setItem('zyvan_organization', JSON.stringify(currentOrg));
            }
          }
        } catch {
          // Keep cached organization
        }
        return;
      }

      // 2. Fallback check: verify session with backend /v1/me
      const storedToken =
        typeof window !== 'undefined' ? localStorage.getItem('zyvan_token') : null;
      const headers: Record<string, string> = {};
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const meRes = await fetch('/api/proxy/v1/me', {
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (meRes.ok) {
        const resData = await meRes.json();
        if (resData.data?.user) {
          const u = resData.data.user;
          const refreshedUser: User = {
            id: u.id,
            name: u.name,
            email: u.email,
            avatar:
              u.avatar ||
              u.image ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.email)}`,
            provider: 'email',
            role: resData.data.role,
            createdAt: u.createdAt || new Date().toISOString(),
          };
          setUser(refreshedUser);
          if (resData.data.organization) {
            setOrganization(resData.data.organization);
            apiClient.setOrganizationId(resData.data.organization.id);
          }
        }
      }
    } catch {
      // Retain cached state
      const cachedUser =
        typeof window !== 'undefined' ? localStorage.getItem('zyvan_user') : null;
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      try {
        const storedUser = localStorage.getItem('zyvan_user');
        const storedToken = localStorage.getItem('zyvan_token');
        const storedProject = localStorage.getItem('zyvan_project');
        const storedOrg = localStorage.getItem('zyvan_organization');

        if (storedToken) {
          apiClient.setAuthToken(storedToken);
          setToken(storedToken);
        }

        if (storedProject) {
          try {
            const parsedProj = JSON.parse(storedProject);
            setProject(parsedProj);
            apiClient.setProjectId(parsedProj.id);
          } catch {
            // ignore
          }
        }

        if (storedOrg) {
          try {
            const parsedOrg = JSON.parse(storedOrg);
            setOrganization(parsedOrg);
            apiClient.setOrganizationId(parsedOrg.id);
          } catch {
            // ignore
          }
        }

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore
          }
        }

        await refreshSession();
      } catch {
        // Corrupted storage
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, [refreshSession]);

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password: pass,
      });

      if (error) {
        throw new Error(error.message || 'Invalid email or password');
      }

      await refreshSession();
    } catch (err: any) {
      // Fallback via proxy if Better Auth direct endpoint is unreachable
      try {
        const res = await fetch('/api/proxy/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password: pass }),
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const resData = await res.json();
          const payload = resData.data;
          const loggedUser: User = {
            id: payload.user.id,
            name: payload.user.name,
            email: payload.user.email,
            avatar:
              payload.user.avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
            provider: 'email',
            role: payload.user.role,
            createdAt: payload.user.createdAt,
          };
          const activeProj: ProjectInfo = {
            id: payload.project?.id || DEFAULT_PROJECT.id,
            name: payload.project?.name || DEFAULT_PROJECT.name,
            plan: payload.project?.plan || DEFAULT_PROJECT.plan,
            status: payload.project?.status || 'active',
          };
          saveSession(loggedUser, payload.token, activeProj);
          return;
        }
      } catch {
        // Fallback failed
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithEmail = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await authClient.signUp.email({
        name,
        email,
        password: pass,
      });

      if (error) {
        throw new Error(error.message || 'Registration failed');
      }

      await refreshSession();
    } catch (err: any) {
      // Fallback via proxy
      try {
        const res = await fetch('/api/proxy/v1/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password: pass }),
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const resData = await res.json();
          const payload = resData.data;
          const newUser: User = {
            id: payload.user.id,
            name: payload.user.name,
            email: payload.user.email,
            avatar:
              payload.user.avatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
            provider: 'email',
            role: payload.user.role,
            createdAt: payload.user.createdAt,
          };
          const activeProj: ProjectInfo = {
            id: payload.project?.id || DEFAULT_PROJECT.id,
            name: payload.project?.name || DEFAULT_PROJECT.name,
            plan: payload.project?.plan || DEFAULT_PROJECT.plan,
            status: payload.project?.status || 'active',
          };
          saveSession(newUser, payload.token, activeProj);
          return;
        }
      } catch {
        // Fallback failed
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    const callbackURL =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '/dashboard';
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL,
    });
    if (error) {
      throw new Error(error.message || 'Google sign-in failed');
    }
  };

  const loginWithGitHub = async () => {
    const callbackURL =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '/dashboard';
    const { error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL,
    });
    if (error) {
      throw new Error(error.message || 'GitHub sign-in failed');
    }
  };

  const loginWithDemo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/proxy/v1/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data;
        const demoUser: User = {
          id: payload.user.id,
          name: payload.user.name,
          email: payload.user.email,
          avatar:
            payload.user.avatar ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
          provider: 'email',
          role: payload.user.role,
          createdAt: payload.user.createdAt,
        };
        const demoProj: ProjectInfo = {
          id: payload.project.id,
          name: payload.project.name,
          plan: payload.project.plan,
          status: payload.project.status,
        };
        saveSession(demoUser, payload.token, demoProj);
        return;
      }
    } catch {
      // Fallback
    }

    const fallbackUser: User = {
      id: 'usr_demo_developer',
      name: 'Zyvan Developer',
      email: 'developer@zyvan.dev',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    saveSession(fallbackUser, `zyvan_demo_jwt_${Date.now()}`);
    setIsLoading(false);
  };

  const logout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // continue
    }
    setUser(null);
    setOrganization(null);
    setToken(null);
    apiClient.setAuthToken(null);
    apiClient.setOrganizationId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zyvan_user');
      localStorage.removeItem('zyvan_token');
      localStorage.removeItem('zyvan_project');
      localStorage.removeItem('zyvan_active_org_id');
      localStorage.removeItem('zyvan_organization');
    }
    router.push('/login');
  };

  const switchOrganization = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId });
    } catch {
      // continue
    }
    const match = organizations.find((o) => o.id === orgId);
    if (match) {
      setOrganization(match);
      apiClient.setOrganizationId(match.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('zyvan_active_org_id', match.id);
        localStorage.setItem('zyvan_organization', JSON.stringify(match));
      }
    }
  };

  const createOrganization = async (name: string, slug: string): Promise<OrganizationInfo> => {
    let newOrg: OrganizationInfo;
    try {
      const res = await authClient.organization.create({ name, slug });
      if (res?.data) {
        newOrg = {
          id: (res.data as any).id,
          name: (res.data as any).name,
          slug: (res.data as any).slug,
          role: 'OWNER',
        };
      } else {
        newOrg = await apiClient.createOrganization({ name, slug });
      }
    } catch {
      newOrg = await apiClient.createOrganization({ name, slug });
    }

    setOrganizations((prev) => [...prev, newOrg]);
    setOrganization(newOrg);
    apiClient.setOrganizationId(newOrg.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zyvan_active_org_id', newOrg.id);
      localStorage.setItem('zyvan_organization', JSON.stringify(newOrg));
    }
    return newOrg;
  };

  const switchProject = (newProject: ProjectInfo) => {
    setProject(newProject);
    apiClient.setProjectId(newProject.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zyvan_project', JSON.stringify(newProject));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        organizations,
        project,
        token,
        isLoading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginWithGitHub,
        loginWithDemo,
        logout,
        switchOrganization,
        createOrganization,
        switchProject,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
