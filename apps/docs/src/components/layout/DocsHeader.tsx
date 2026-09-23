'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Github, ExternalLink, Menu, X } from 'lucide-react';
import { DOCS_LINKS } from '@/lib/constants';

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
