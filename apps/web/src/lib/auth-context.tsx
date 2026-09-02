'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'github' | 'email';
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

  // Load session from storage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('zyvan_user');
      const storedToken = localStorage.getItem('zyvan_token');
      const storedProject = localStorage.getItem('zyvan_project');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
      if (storedProject) {
        setProject(JSON.parse(storedProject));
      }
    } catch {
      // Storage unavailable or corrupted
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('zyvan_user', JSON.stringify(newUser));
    localStorage.setItem('zyvan_token', newToken);
    if (!project) {
      setProject(DEFAULT_PROJECT);
      localStorage.setItem('zyvan_project', JSON.stringify(DEFAULT_PROJECT));
    }
  };

  const loginWithEmail = async (email: string, _pass: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const name = email.split('@')[0] || 'Developer';
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const newUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: formattedName,
      email,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    saveSession(newUser, `zyvan_jwt_${Date.now()}`);
    setIsLoading(false);
  };

  const signupWithEmail = async (name: string, email: string, _pass: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: name || email.split('@')[0],
      email,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    saveSession(newUser, `zyvan_jwt_${Date.now()}`);
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newUser: User = {
      id: 'usr_google_10829124',
      name: 'Alex Rivera',
      email: 'alex.rivera@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      provider: 'google',
      createdAt: new Date().toISOString(),
    };
    saveSession(newUser, `zyvan_google_oauth_${Date.now()}`);
    setIsLoading(false);
  };

  const loginWithGitHub = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newUser: User = {
      id: 'usr_github_8921820',
      name: 'sultanxdev',
      email: 'sultan@zyvan.dev',
      avatar: 'https://github.com/sultanxdev.png',
      provider: 'github',
      createdAt: new Date().toISOString(),
    };
    saveSession(newUser, `zyvan_github_oauth_${Date.now()}`);
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('zyvan_user');
    localStorage.removeItem('zyvan_token');
    router.push('/login');
  };

  const switchProject = (newProject: ProjectInfo) => {
    setProject(newProject);
    localStorage.setItem('zyvan_project', JSON.stringify(newProject));
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
