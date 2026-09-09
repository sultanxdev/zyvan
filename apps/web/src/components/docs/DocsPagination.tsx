'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface DocsPaginationProps {
  prev: { slug: string; title: string; category?: string } | null;
  next: { slug: string; title: string; category?: string } | null;
}

export function DocsPagination({ prev, next }: DocsPaginationProps) {
  if (!prev && !next) return null;

  return (
    <div className="my-10 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-850 pt-6 font-sans">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="group flex flex-col justify-between rounded-xl border border-white/10 bg-zinc-950/50 p-4 transition-all hover:border-indigo-500/40 hover:bg-zinc-900/50 text-left"
        >
          <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono mb-1">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Previous</span>
          </div>
          <div className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
            {prev.title}
          </div>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="group flex flex-col justify-between rounded-xl border border-white/10 bg-zinc-950/50 p-4 transition-all hover:border-indigo-500/40 hover:bg-zinc-900/50 text-right sm:text-right"
        >
          <div className="flex items-center justify-end gap-1 text-xs text-zinc-500 font-mono mb-1">
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
            {next.title}
          </div>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
