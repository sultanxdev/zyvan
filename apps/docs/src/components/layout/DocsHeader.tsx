'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ExternalLink, Menu, X } from 'lucide-react';
import { DOCS_LINKS } from '@/lib/constants';

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface DocsHeaderProps {
  onOpenSearch: () => void;
  onToggleMobileNav: () => void;
  isMobileNavOpen: boolean;
}

export function DocsHeader({
  onOpenSearch,
  onToggleMobileNav,
  isMobileNavOpen,
}: DocsHeaderProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Overview', href: '/getting-started/quickstart' },
    { label: 'SDK', href: '/sdks/typescript-node' },
    { label: 'Guides', href: '/guides/verify-webhook-signatures' },
    { label: 'API Reference', href: '/api-reference/events' },
    { label: 'Architecture', href: '/architecture/system-overview' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1B241F] bg-[#050505]/90 backdrop-blur-xl font-mono">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile menu toggle + Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileNav}
            aria-label="Toggle navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1B241F] bg-[#0B0D0C] text-zinc-400 hover:text-white lg:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]"
          >
            {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#22C55E]/30 bg-[#0B0D0C] text-[#22C55E] font-bold text-sm shadow-[0_0_10px_rgba(34,197,94,0.15)] group-hover:border-[#22C55E] transition-colors">
              Z
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white tracking-tight lowercase">zyvan</span>
              <span className="text-[#22C55E] text-xs font-semibold">/docs</span>
              <span className="hidden sm:inline-flex rounded bg-[#101412] border border-[#1B241F] px-1.5 py-0.2 text-[10px] text-zinc-400 ml-1">
                v0.1
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Top Category Links */}
        <nav aria-label="Main documentation categories" className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const rootSection = link.href.split('/')[1];
            const isActive = pathname.startsWith(`/${rootSection}`);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#101412] text-[#22C55E] border border-[#22C55E]/30 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#0B0D0C]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search Trigger & External Links */}
        <div className="flex items-center gap-2.5">
          {/* Search Trigger Button (⌘K) */}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search documentation (Press ⌘K to open)"
            className="flex items-center gap-2 rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-2.5 py-1.5 text-xs text-zinc-400 hover:border-[#22C55E]/40 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#22C55E]"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Search docs...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[#1B241F] bg-[#101412] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* GitHub Link */}
          <a
            href={DOCS_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Zyvan GitHub repository"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1B241F] bg-[#0B0D0C] text-zinc-400 hover:text-zinc-100 hover:border-[#22C55E]/30 transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Customer Dashboard Link */}
          <a
            href={DOCS_LINKS.dashboard}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-[#22C55E]/40 hover:text-[#22C55E] transition-colors"
          >
            <span>Dashboard</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </div>
    </header>
  );
}
