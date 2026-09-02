'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  GithubIcon,
  FlashIcon,
  Menu01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';

import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center px-3 pt-3 sm:px-8 sm:pt-6 pointer-events-none">
      <nav className="pointer-events-auto flex w-full max-w-[1040px] items-center justify-between gap-3 rounded-full border border-black/[0.08] bg-white/80 px-4 py-2.5 sm:px-5 sm:py-3 text-foreground shadow-[0_12px_36px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all">
        {/* Brand Logo & Version */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative size-7 sm:size-8 rounded-full overflow-hidden shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center bg-black border border-black/10">
              <img
                src="/logo.png"
                alt="Zyvan logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-lg tracking-tight text-foreground lowercase">zyvan</span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200/60 font-mono">
                v0.1
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links (Centering inspired by make.design) */}
        <div className="hidden md:flex items-center gap-6 lg:gap-7 text-[13.5px] font-medium text-zinc-600">
          <Link href="/#features" className="hover:text-zinc-950 transition-colors">
            Features
          </Link>
          <Link href="/#quickstart" className="hover:text-zinc-950 transition-colors">
            Quickstart
          </Link>
          <Link href="/docs" className="hover:text-zinc-950 transition-colors font-medium text-zinc-900">
            Docs
          </Link>
          <Link href="/#pricing" className="hover:text-zinc-950 transition-colors">
            Pricing
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/sultanxdev/zyvan"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center size-8 rounded-full border border-black/[0.08] bg-zinc-50 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
            title="View on GitHub"
          >
            <Icon icon={GithubIcon} size={15} />
          </a>

          {user ? (
            <Button
              variant="default"
              size="sm"
              asChild
              className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs px-4 py-1.5 h-8 shadow-xs"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <img src={user.avatar} alt={user.name} className="size-4 rounded-full" />
                <span>Dashboard</span>
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-xs font-medium text-zinc-600 hover:text-zinc-950 px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Button
                size="sm"
                asChild
                className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs px-3.5 sm:px-4 py-1.5 h-8 shadow-xs font-medium"
              >
                <Link href="/dashboard" className="flex items-center gap-1.5">
                  <span>Get Started</span>
                  <Icon icon={ArrowRight01Icon} size={14} />
                </Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden size-8 items-center justify-center rounded-full border border-black/[0.08] bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            aria-label="Toggle menu"
          >
            <Icon icon={mobileMenuOpen ? Cancel01Icon : Menu01Icon} size={16} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto mt-2 w-full max-w-[840px] rounded-2xl border border-black/[0.08] bg-white/95 p-4 shadow-xl backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-2.5 text-sm font-medium text-zinc-700">
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#quickstart"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Quickstart
            </Link>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors font-medium text-zinc-950"
            >
              Documentation
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Pricing
            </Link>
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold text-zinc-600 px-2 py-1"
              >
                Sign In
              </Link>
              <a
                href="https://github.com/sultanxdev/zyvan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-zinc-600 flex items-center gap-1.5 px-2 py-1"
              >
                <Icon icon={GithubIcon} size={14} />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
