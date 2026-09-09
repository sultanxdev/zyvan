'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Github,
  ArrowUpRight,
  Sparkles,
  Menu,
  X,
  Radio,
} from 'lucide-react';

interface DocsHeaderProps {
  onOpenSearch: () => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export function DocsHeader({
  onOpenSearch,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}: DocsHeaderProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Overview', href: '/docs/getting-started/introduction' },
    { label: 'Guides', href: '/docs/guides/send-first-event' },
    { label: 'Architecture', href: '/docs/architecture/system-overview' },
    { label: 'API Reference', href: '/docs/api-reference/authentication' },
    { label: 'Webhooks', href: '/docs/webhooks/lifecycle-and-states' },
    { label: 'SDKs', href: '/docs/sdks/typescript-node' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#09090d]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#09090d]/60">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile menu toggle + Brand Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white lg:hidden"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/docs/getting-started/introduction" className="flex items-center gap-2.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 text-white font-bold text-sm tracking-wider font-mono">
              Z
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-sans font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                zyvan<span className="text-indigo-400">.docs</span>
              </span>
              <span className="hidden sm:inline-block rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.2 text-[10px] font-mono font-medium text-indigo-300">
                v0.1.0
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Trigger.dev-style Category Tabs */}
        <nav className="hidden md:flex items-center gap-1 font-sans">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href.split('/').slice(0, 3).join('/'));
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search Bar trigger + Status + GitHub + Dashboard */}
        <div className="flex items-center gap-2.5">
          {/* Search Trigger Button (Trigger.dev / Mintlify style) */}
          <button
            onClick={onOpenSearch}
            aria-label="Search documentation"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400 hover:border-indigo-500/40 hover:text-zinc-200 hover:bg-zinc-900 transition-all shadow-inner w-36 sm:w-56 justify-between group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
              <span className="truncate text-[12px] font-sans">Search docs...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* System Status Pill */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Operational</span>
          </div>

          {/* GitHub Repo */}
          <a
            href="https://github.com/sultanxdev/zyvan"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all font-sans"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          {/* Dashboard Link */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/25 transition-all font-sans"
          >
            <span>Console</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
