'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Filter,
  Sparkles,
  Layers,
  Terminal,
  BookOpen,
  Code2,
  Shield,
  FileCode,
} from 'lucide-react';
import clsx from 'clsx';
import type { NavGroup } from '@/lib/types';

interface DocsSidebarProps {
  groups: NavGroup[];
  onItemClick?: () => void;
}

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Getting Started': Sparkles,
  'Core Concepts': Layers,
  'SDKs & Tools': Code2,
  'Guides': BookOpen,
  'API Reference': Terminal,
  'Architecture': Shield,
  'Resources': FileCode,
};

const METHOD_BADGES: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'bg-emerald-950/40 border-emerald-500/30', text: 'text-emerald-400' },
  POST: { bg: 'bg-blue-950/40 border-blue-500/30', text: 'text-blue-400' },
  PUT: { bg: 'bg-amber-950/40 border-amber-500/30', text: 'text-amber-400' },
  PATCH: { bg: 'bg-orange-950/40 border-orange-500/30', text: 'text-orange-400' },
  DELETE: { bg: 'bg-red-950/40 border-red-500/30', text: 'text-red-400' },
};

export function DocsSidebar({ groups, onItemClick }: DocsSidebarProps) {
  const pathname = usePathname();
  const [filterQuery, setFilterQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <aside
      aria-label="Documentation sidebar navigation"
      className="h-full w-full flex flex-col font-mono text-xs select-none"
    >
      {/* Search / Section Filter Input */}
      <div className="px-3 pt-4 pb-2">
        <div className="relative flex items-center">
          <Filter className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Filter sections..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-md border border-[#1B241F] bg-[#0B0D0C] pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-[#22C55E]/50 focus:bg-[#101412] focus:outline-none transition-colors"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-2 text-xs text-zinc-500 hover:text-zinc-300"
              aria-label="Clear filter"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Groups List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin">
        {groups.map((group) => {
          const IconComponent = GROUP_ICONS[group.name] || BookOpen;
          const isCollapsed = collapsedGroups[group.name] && !filterQuery;

          // Apply client filter
          const items = filterQuery
            ? group.items.filter((item) =>
                item.title.toLowerCase().includes(filterQuery.toLowerCase())
              )
            : group.items;

          if (filterQuery && items.length === 0) return null;

          return (
            <div key={group.name} className="space-y-1">
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => toggleGroup(group.name)}
                className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors group"
                aria-expanded={!isCollapsed}
              >
                <div className="flex items-center gap-1.5">
                  <IconComponent className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#22C55E] transition-colors" />
                  <span>{group.name}</span>
                </div>
                <ChevronRight
                  className={clsx(
                    'w-3.5 h-3.5 text-zinc-600 transition-transform duration-150',
                    !isCollapsed && 'rotate-90 text-zinc-400'
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="space-y-0.5 pt-0.5 pl-2 border-l border-[#1B241F] ml-3">
                  {items.map((item) => {
                    const itemHref = `/${item.slug}`;
                    const isActive = pathname === itemHref;
                    const methodBadge = item.apiMethod ? METHOD_BADGES[item.apiMethod] : null;

                    return (
                      <Link
                        key={item.slug}
                        href={itemHref}
                        onClick={onItemClick}
                        className={clsx(
                          'flex items-center justify-between rounded px-2.5 py-1.5 transition-colors text-xs font-medium',
                          isActive
                            ? 'bg-[#101412] text-[#22C55E] border-l-2 border-[#22C55E] font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0B0D0C]'
                        )}
                      >
                        <span className="truncate">{item.title}</span>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          {methodBadge && (
                            <span
                              className={clsx(
                                'rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase',
                                methodBadge.bg,
                                methodBadge.text
                              )}
                            >
                              {item.apiMethod}
                            </span>
                          )}
                          {item.badge && (
                            <span className="rounded bg-[#22C55E]/10 border border-[#22C55E]/30 px-1 py-0.2 text-[9px] text-[#22C55E] uppercase font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
