'use client';

import React from 'react';

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  return (
    <div className="relative my-8 border-l border-zinc-800 ml-4 pl-6 space-y-8 font-geist-mono font-mono">
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
      <div className="absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#00DC5A]/40 bg-zinc-950 text-xs font-mono font-semibold text-[#00DC5A] shadow-[0_0_12px_rgba(0,220,90,0.2)] group-hover:border-[#00DC5A] transition-colors">
        {number || '•'}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-base font-semibold text-zinc-100 tracking-tight">
            {title}
          </h4>
          {badge && (
            <span className="rounded-full bg-[#00DC5A]/10 border border-[#00DC5A]/20 px-2 py-0.5 text-[10px] text-[#00DC5A]">
              {badge}
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-300 leading-relaxed prose-strong:text-zinc-100">
          {children}
        </div>
      </div>
    </div>
  );
}
