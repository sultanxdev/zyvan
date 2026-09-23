'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

interface CardProps {
  title: string;
  href?: string;
  badge?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Card({ title, href, badge, icon, children }: CardProps) {
  const content = (
    <div className="h-full rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-5 transition-all duration-200 hover:border-[#22C55E]/40 hover:bg-[#101412] group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[#22C55E]/10 text-[#22C55E]">
                {icon}
              </div>
            )}
            <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="rounded bg-[#22C55E]/10 border border-[#22C55E]/20 px-1.5 py-0.5 text-[10px] text-[#22C55E] uppercase font-mono">
                {badge}
              </span>
            )}
            {href && (
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#22C55E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            )}
          </div>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed font-mono">
          {children}
        </p>
      </div>
    </div>
  );

  if (href) {
    const isExternal = href.startsWith('http');
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

export function Cards({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'grid gap-4 my-6',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {children}
    </div>
  );
}

// Backward-compatible alias
export const CardGroup = Cards;

