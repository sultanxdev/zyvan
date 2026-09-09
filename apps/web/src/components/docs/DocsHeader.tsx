'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  ArrowUpRight,
  Menu,
  X,
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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0A0D]/90 backdrop-blur-xl font-geist-mono font-mono">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile menu toggle + Brand Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white lg:hidden"
          >
            {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <Link href="/docs/getting-started/introduction" className="flex items-center gap-2.5 group">
            <div className="relative size-7 rounded-full overflow-hidden shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center bg-black border border-white/20">
              <img
                src="/logo.png"
                alt="Zyvan logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-base tracking-tight text-white lowercase">zyvan</span>
              <span className="text-[#00DC5A] text-xs font-bold font-mono">/docs</span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 font-mono ml-1">
                v0.1
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Category Tabs with Green / Black Accents */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href.split('/').slice(0, 3).join('/'));
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#00DC5A]/15 text-[#00DC5A] border border-[#00DC5A]/30 shadow-[0_0_12px_rgba(0,220,90,0.15)] font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search Bar + Status + GitHub + Console */}
        <div className="flex items-center gap-2.5">
          {/* Search Trigger Button */}
          <button
            onClick={onOpenSearch}
            aria-label="Search documentation"
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-400 hover:border-[#00DC5A]/40 hover:text-zinc-200 hover:bg-zinc-900 transition-all shadow-inner w-36 sm:w-52 justify-between group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#00DC5A] transition-colors" />
              <span className="truncate text-[12px]">Search docs...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* System Status Pill with #00DC5A dot */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-[#00DC5A]/30 bg-[#00DC5A]/10 px-2.5 py-1 text-[11px] font-mono text-[#00DC5A]">
            <span className="size-1.5 rounded-full bg-[#00DC5A] animate-pulse" />
            <span>Operational</span>
          </div>

          {/* GitHub Repo */}
          <a
            href="https://github.com/sultanxdev/zyvan"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center size-8 rounded-lg border border-white/[0.08] bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="View on GitHub"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          {/* Console / Dashboard Button */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full bg-[#00DC5A] text-black hover:bg-[#00c751] px-3.5 py-1.5 text-xs font-bold transition-all shadow-md shadow-[#00DC5A]/20"
          >
            <span>Console</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
