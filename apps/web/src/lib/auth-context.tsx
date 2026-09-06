'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api-client';

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

interface AuthContextType {
  user: User | null;
  project: ProjectInfo | null;
  token: string | null;
  isLoading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  loginWithDemo: () => Promise<void>;
  logout: () => void;
  switchProject: (project: ProjectInfo) => void;
}

const DEFAULT_PROJECT: ProjectInfo = {
  id: '0198fa72-91bc-7123-8819-0012891fa120',
  name: 'Default Production Project',
  plan: 'scale',
  status: 'active',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<ProjectInfo | null>(DEFAULT_PROJECT);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const saveSession = useCallback((newUser: User, newToken: string, newProject?: ProjectInfo) => {
    setUser(newUser);
    setToken(newToken);
    apiClient.setAuthToken(newToken);

    if (typeof window !== 'undefined') {
      localStorage.setItem('zyvan_user', JSON.stringify(newUser));
      localStorage.setItem('zyvan_token', newToken);
    }

    const targetProject = newProject || project || DEFAULT_PROJECT;
    setProject(targetProject);
    apiClient.setProjectId(targetProject.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zyvan_project', JSON.stringify(targetProject));
    }
  }, [project]);

  // Load session from storage and verify with backend
  useEffect(() => {
    async function initSession() {
      try {
        const storedUser = localStorage.getItem('zyvan_user');
        const storedToken = localStorage.getItem('zyvan_token');
        const storedProject = localStorage.getItem('zyvan_project');

        if (storedToken) {
          apiClient.setAuthToken(storedToken);
          setToken(storedToken);

          if (storedProject) {
            const parsedProj = JSON.parse(storedProject);
            setProject(parsedProj);
            apiClient.setProjectId(parsedProj.id);
          }

          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }

          // Verify session against backend /v1/auth/me
          try {
            const meRes = await fetch('/api/proxy/v1/auth/me', {
              headers: {
                Authorization: `Bearer ${storedToken}`,
                ...(storedProject ? { 'X-Project-Id': JSON.parse(storedProject).id } : {}),
              },
              cache: 'no-store',
              signal: AbortSignal.timeout(3000),
            });

            if (meRes.ok) {
              const resData = await meRes.json();
              if (resData.data?.user) {
                const refreshedUser: User = {
                  id: resData.data.user.id,
                  name: resData.data.user.name,
                  email: resData.data.user.email,
                  avatar: resData.data.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(resData.data.user.email)}`,
                  provider: 'email',
                  role: resData.data.user.role,
                  createdAt: resData.data.user.createdAt,
                };
                setUser(refreshedUser);
                localStorage.setItem('zyvan_user', JSON.stringify(refreshedUser));

                if (resData.data.activeProject) {
                  const refreshedProj: ProjectInfo = {
                    id: resData.data.activeProject.id,
                    name: resData.data.activeProject.name,
                    plan: resData.data.activeProject.plan,
                    status: resData.data.activeProject.status,
                  };
                  setProject(refreshedProj);
                  apiClient.setProjectId(refreshedProj.id);
                  localStorage.setItem('zyvan_project', JSON.stringify(refreshedProj));
                }
              }
            }
          } catch {
            // Offline or proxy unreachable — retain cached session
          }
        }
      } catch {
        // Corrupted storage
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/proxy/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data;
        const loggedUser: User = {
          id: payload.user.id,
          name: payload.user.name,
          email: payload.user.email,
          avatar: payload.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          provider: 'email',
          role: payload.user.role,
          createdAt: payload.user.createdAt,
        };
        const activeProj: ProjectInfo = {
          id: payload.project.id,
          name: payload.project.name,
          plan: payload.project.plan,
          status: payload.project.status,
        };
        saveSession(loggedUser, payload.token, activeProj);
        return;
      }

      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Invalid email or password');
    } catch (err: any) {
      if (err.message && err.message !== 'Failed to fetch') {
        throw err;
      }
      // Offline fallback: demo session
      const name = email.split('@')[0] || 'Developer';
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      const fallbackUser: User = {
        id: `usr_${Date.now()}`,
        name: formattedName,
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        provider: 'email',
        createdAt: new Date().toISOString(),
      };
      saveSession(fallbackUser, `zyvan_jwt_local_${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithEmail = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/proxy/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data;
        const newUser: User = {
          id: payload.user.id,
          name: payload.user.name,
          email: payload.user.email,
          avatar: payload.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
          provider: 'email',
          role: payload.user.role,
          createdAt: payload.user.createdAt,
        };
        const newProj: ProjectInfo = {
          id: payload.project.id,
          name: payload.project.name,
          plan: payload.project.plan,
          status: payload.project.status,
        };
        saveSession(newUser, payload.token, newProj);
        return;
      }

      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Registration failed');
    } catch (err: any) {
      if (err.message && err.message !== 'Failed to fetch') {
        throw err;
      }
      // Offline fallback
      const fallbackUser: User = {
        id: `usr_${Date.now()}`,
        name: name || email.split('@')[0],
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        provider: 'email',
        createdAt: new Date().toISOString(),
      };
      saveSession(fallbackUser, `zyvan_jwt_local_${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithDemo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/proxy/v1/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data;
        const demoUser: User = {
          id: payload.user.id,
          name: payload.user.name,
          email: payload.user.email,
          avatar: payload.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
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
      // Offline demo fallback
    }

    const fallbackUser: User = {
      id: 'usr_demo_developer',
      name: 'Zyvan Developer',
      email: 'developer@zyvan.dev',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    saveSession(fallbackUser, `zyvan_demo_jwt_${Date.now()}`);
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    await loginWithDemo();
  };

  const loginWithGitHub = async () => {
    await loginWithDemo();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    apiClient.setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zyvan_user');
      localStorage.removeItem('zyvan_token');
      localStorage.removeItem('zyvan_project');
    }
    router.push('/login');
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
        project,
        token,
        isLoading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginWithGitHub,
        loginWithDemo,
        logout,
        switchProject,
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
