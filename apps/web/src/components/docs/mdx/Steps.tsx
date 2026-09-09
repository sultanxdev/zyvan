'use client';

import React from 'react';

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  return (
    <div className="relative my-8 border-l border-zinc-800 ml-4 pl-6 space-y-8">
      {children}
    </div>
  );
}

interface StepProps {
  title: string;
  number?: number | string;
  badge?: string;
  children: React.ReactNode;
}

export function Step({ title, number, badge, children }: StepProps) {
  return (
    <div className="relative group">
      {/* Number Badge on the vertical line */}
      <div className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-indigo-500/40 bg-zinc-950 text-xs font-mono font-semibold text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.25)] group-hover:border-indigo-400 transition-colors">
        {number || '•'}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-base font-semibold text-zinc-100 tracking-tight font-sans">
            {title}
          </h4>
          {badge && (
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-mono text-indigo-300">
              {badge}
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-300 leading-relaxed font-sans prose-strong:text-zinc-100">
          {children}
        </div>
      </div>
    </div>
  );
}
