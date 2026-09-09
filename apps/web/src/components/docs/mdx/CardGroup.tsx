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
    <div className={`my-8 grid gap-4 ${colClass[cols] || colClass[2]} font-geist-mono font-mono`}>
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
      className="group relative flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0E0E12]/80 p-5 backdrop-blur-md transition-all duration-200 hover:border-[#00DC5A]/40 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(0,220,90,0.1)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#00DC5A]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#00DC5A]/20 bg-[#00DC5A]/10 text-[#00DC5A] group-hover:border-[#00DC5A]/40 transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">
              {title}
            </h4>
          </div>
          {badge && (
            <span className="rounded-full bg-[#00DC5A]/10 border border-[#00DC5A]/20 px-2 py-0.5 text-[10px] text-[#00DC5A]">
              {badge}
            </span>
          )}
        </div>

        <div className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
          {children}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#00DC5A] opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
        <span>Learn more</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
