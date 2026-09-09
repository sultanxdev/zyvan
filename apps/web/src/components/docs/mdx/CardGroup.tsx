'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Zap,
  Shield,
  Layers,
  Code2,
  Terminal,
  Cpu,
  RefreshCw,
  Search,
} from 'lucide-react';

interface CardGroupProps {
  cols?: 1 | 2 | 3;
  children: React.ReactNode;
}

export function CardGroup({ cols = 2, children }: CardGroupProps) {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={`my-8 grid gap-4 ${colClass[cols] || colClass[2]}`}>
      {children}
    </div>
  );
}

interface CardProps {
  title: string;
  href: string;
  icon?: 'book' | 'zap' | 'shield' | 'layers' | 'code' | 'terminal' | 'cpu' | 'retry' | 'search';
  badge?: string;
  children: React.ReactNode;
}

export function Card({ title, href, icon, badge, children }: CardProps) {
  const iconMap = {
    book: BookOpen,
    zap: Zap,
    shield: Shield,
    layers: Layers,
    code: Code2,
    terminal: Terminal,
    cpu: Cpu,
    retry: RefreshCw,
    search: Search,
  };

  const Icon = icon ? iconMap[icon] || BookOpen : null;

  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-md transition-all duration-200 hover:border-indigo-500/50 hover:bg-zinc-900/60 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-950/30 text-indigo-400 group-hover:border-indigo-500/40 group-hover:text-indigo-300 transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <h4 className="text-sm font-semibold text-zinc-100 font-sans group-hover:text-white transition-colors">
              {title}
            </h4>
          </div>
          {badge && (
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              {badge}
            </span>
          )}
        </div>

        <div className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-3">
          {children}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-indigo-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
        <span>Learn more</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
