'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  ServerIcon,
  GithubIcon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  FlashIcon,
} from '@hugeicons/core-free-icons';

import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Complete Brand Logo (Logo Mark + zyvan) */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative size-8 sm:size-9 rounded-xl overflow-hidden shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center bg-black">
              <img
                src="/logo.png"
                alt="Zyvan logo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-foreground lowercase">zyvan</span>
              <Badge variant="pill" className="text-[10px] px-1.5 py-0 uppercase">v0.1</Badge>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </Link>
            <Link href="#simulator" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <span>Simulator</span>
              <span className="size-1.5 rounded-full bg-[#00DC5A] animate-pulse" />
            </Link>
            <Link href="#quickstart" className="hover:text-foreground transition-colors">
              Quickstart
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors font-semibold text-zinc-950">
              Docs
            </Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* System Status Pill */}
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Operational</span>
          </div>

          <a
            href="https://github.com/sultanxdev/zyvan"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center size-9 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="View on GitHub"
          >
            <Icon icon={GithubIcon} size={18} />
          </a>

          {user ? (
            <Button variant="glow" size="sm" asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <img src={user.avatar} alt={user.name} className="size-4 rounded-full" />
                <span>Dashboard</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="glow" size="sm" asChild>
                <Link href="/dashboard" className="flex items-center gap-1.5">
                  <span>Dashboard</span>
                  <Icon icon={FlashIcon} size={16} />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
