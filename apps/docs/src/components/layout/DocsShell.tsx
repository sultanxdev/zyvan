'use client';

import React, { useState } from 'react';
import { DocsHeader } from './DocsHeader';
import { DocsSidebar } from './DocsSidebar';
import { DocsSearch } from './DocsSearch';
import { DocsFooter } from './DocsFooter';
import type { NavGroup, SearchDocItem } from '@/lib/types';

interface DocsShellProps {
  groups: NavGroup[];
  searchIndex: SearchDocItem[];
  children: React.ReactNode;
}

export function DocsShell({ groups, searchIndex, children }: DocsShellProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#F4F4F5] font-mono">
      {/* Top Header */}
      <DocsHeader
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
        isMobileNavOpen={isMobileNavOpen}
      />

      {/* Main Container */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto flex">
        {/* Left Desktop Sidebar (Hidden on mobile < 1024px) */}
        <div className="hidden lg:block w-64 shrink-0 border-r border-[#1B241F] bg-[#050505]">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            <DocsSidebar groups={groups} />
          </div>
        </div>

        {/* Center Content Reading Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>
          <DocsFooter />
        </div>
      </div>

      {/* Mobile Slide-Out Drawer */}
      {isMobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#0B0D0C] border-r border-[#1B241F] shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-[#1B241F] flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-100">Zyvan Docs</span>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DocsSidebar
                groups={groups}
                onItemClick={() => setIsMobileNavOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Command Palette Modal */}
      <DocsSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchIndex={searchIndex}
      />
    </div>
  );
}
