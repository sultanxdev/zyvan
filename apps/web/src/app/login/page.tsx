'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowRight01Icon, ArrowLeft01Icon, LockKeyIcon, Mail01Icon } from '@hugeicons/core-free-icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { loginWithEmail, loginWithGoogle, loginWithGitHub } = useAuth();
  const router = useRouter();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError(null);
    setLoadingAction('email');
    try {
      await loginWithEmail(email, password);
      router.push('/dashboard');
    } catch {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoadingAction('google');
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch {
      setError('Google sign-in failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGitHubLogin = async () => {
    setError(null);
    setLoadingAction('github');
    try {
      await loginWithGitHub();
      router.push('/dashboard');
    } catch {
      setError('GitHub sign-in failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleQuickDemo = async () => {
    setEmail('developer@zyvan.dev');
    setPassword('zyvan_secure_2026');
    setLoadingAction('demo');
    await loginWithEmail('developer@zyvan.dev', 'zyvan_secure_2026');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background bg-grid-pattern relative">
      {/* Return home link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon icon={ArrowLeft01Icon} size={16} />
          <span>Back to Landing</span>
        </Link>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Logo Lockup */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative size-10 rounded-xl overflow-hidden shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center bg-black">
              <img src="/logo.png" alt="Zyvan logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground lowercase">zyvan</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground pt-3">
            Sign in to your account
          </h1>
          <p className="text-xs text-muted-foreground">
            Access your event streams, destinations, and reliability metrics
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/5 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="space-y-2.5">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={!!loadingAction}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-white text-zinc-800 text-sm font-medium hover:bg-secondary/70 hover:border-zinc-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingAction === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* GitHub */}
            <button
              type="button"
              onClick={handleGitHubLogin}
              disabled={!!loadingAction}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-zinc-950 bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="size-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>{loadingAction === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-border/80 w-full" />
            <span className="bg-white px-3 text-[10px] font-mono text-muted-foreground uppercase tracking-wider relative">
              Or sign in with email
            </span>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 font-mono mb-1.5">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Icon icon={Mail01Icon} size={16} className="absolute left-3 top-3 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all placeholder:text-zinc-400"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-800 font-mono">
                  PASSWORD
                </label>
                <span className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
                  Forgot?
                </span>
              </div>
              <div className="relative">
                <Icon icon={LockKeyIcon} size={16} className="absolute left-3 top-3 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 transition-all placeholder:text-zinc-400"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!!loadingAction}
              className="w-full h-10 font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-all shadow-md"
            >
              {loadingAction === 'email' ? 'Authenticating...' : 'Sign In with Email'}
            </Button>
          </form>

          {/* Instant Demo Sandbox Shortcut */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-secondary/40 hover:bg-secondary text-xs text-zinc-800 font-medium transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#00DC5A] animate-pulse" />
                <span>One-Click Test Developer Login</span>
              </div>
              <Icon icon={ArrowRight01Icon} size={14} className="text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-foreground font-semibold underline underline-offset-4 hover:text-black">
            Create a Zyvan account
          </Link>
        </p>
      </div>
    </div>
  );
}
