'use client';

import React, { useState } from 'react';
import { DocsHeader } from './DocsHeader';
import { DocsSidebar } from './DocsSidebar';
import { CommandPalette } from './CommandPalette';
import { NavCategory, SearchResultItem } from '@/lib/mdx';

interface DocsLayoutClientProps {
  categories: NavCategory[];
  searchIndex: SearchResultItem[];
  children: React.ReactNode;
}

export function DocsLayoutClient({
  categories,
  searchIndex,
  children,
}: DocsLayoutClientProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090d] text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden">
      {/* Top Ambient Gradient Glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[350px] w-full max-w-7xl bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.15),_rgba(168,85,247,0.05),_transparent_70%)] z-0" />

      {/* Trigger.dev Style Header */}
      <DocsHeader
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main Documentation Shell: 3-column Layout */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex">
          {/* Desktop Left Sidebar */}
          <div className="hidden lg:block w-64 shrink-0 border-r border-white/10 pr-3 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            <DocsSidebar categories={categories} />
          </div>

          {/* Mobile Drawer Sidebar */}
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-md">
              <div className="relative w-4/5 max-w-xs h-full bg-[#0d0d12] border-r border-white/10 p-4 shadow-2xl overflow-y-auto">
                <DocsSidebar
                  categories={categories}
                  onItemClick={() => setIsMobileSidebarOpen(false)}
                />
              </div>
              <div
                className="flex-1"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          )}

          {/* Center + Right TOC Content */}
          <main className="flex-1 min-w-0 py-8 lg:px-8 xl:px-10">
            {children}
          </main>
        </div>
      </div>

      {/* Global ⌘K Command Palette Modal */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchIndex={searchIndex}
      />
    </div>
  );
}
