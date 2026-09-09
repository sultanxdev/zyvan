'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Filter, BookOpen, Layers, Terminal, Sparkles, Shield, Cpu, Code2 } from 'lucide-react';
import { NavCategory } from '@/lib/mdx';

interface DocsSidebarProps {
  categories: NavCategory[];
  onItemClick?: () => void;
}

export function DocsSidebar({ categories, onItemClick }: DocsSidebarProps) {
  const pathname = usePathname();
  const [filterQuery, setFilterQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (title: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const getCategoryIcon = (title: string) => {
    switch (title) {
      case 'Getting Started':
        return Sparkles;
      case 'Core Concepts':
        return Layers;
      case 'Architecture':
        return Cpu;
      case 'Guides':
        return BookOpen;
      case 'Webhooks & Reliability':
        return Shield;
      case 'API Reference':
        return Terminal;
      case 'SDKs & Tools':
        return Code2;
      default:
        return BookOpen;
    }
  };

  const methodColors: Record<string, string> = {
    GET: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    POST: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    PUT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    DELETE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <aside className="h-full w-full flex flex-col font-sans select-none">
      {/* Quick sidebar filter */}
      <div className="px-3 pt-4 pb-2">
        <div className="relative flex items-center">
          <Filter className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter sections..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:bg-zinc-900 focus:outline-none transition-colors"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.title);
          const isCollapsed = collapsedCategories[cat.title];

          // Filter items if search query is provided
          const items = filterQuery
            ? cat.items.filter(
                (item) =>
                  item.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
                  item.apiPath?.toLowerCase().includes(filterQuery.toLowerCase())
              )
            : cat.items;

          if (filterQuery && items.length === 0) return null;

          return (
            <div key={cat.title} className="space-y-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.title)}
                className="flex w-full items-center justify-between px-2 py-1 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
                  <span className="font-mono text-[11px]">{cat.title}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${
                    !isCollapsed ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Items List */}
              {!isCollapsed && (
                <div className="space-y-0.5 pt-1 pl-2 border-l border-zinc-800/80 ml-3">
                  {items.map((item) => {
                    const href = `/docs/${item.slug}`;
                    const isActive =
                      pathname === href ||
                      (pathname === '/docs' && item.slug === 'getting-started/introduction');

                    return (
                      <Link
                        key={item.slug}
                        href={href}
                        onClick={onItemClick}
                        className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-150 ${
                          isActive
                            ? 'bg-indigo-600/15 text-indigo-300 font-medium shadow-[inset_0_0_12px_rgba(99,102,241,0.15)] border-l-2 border-indigo-500 pl-2'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{item.title}</span>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {item.apiMethod && (
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase border ${
                                methodColors[item.apiMethod] || 'text-zinc-400 border-zinc-800'
                              }`}
                            >
                              {item.apiMethod}
                            </span>
                          )}
                          {item.badge && (
                            <span className="rounded-full bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">
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
      </div>
    </aside>
  );
}
