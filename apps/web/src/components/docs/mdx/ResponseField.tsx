'use client';

import React from 'react';

interface ResponseFieldProps {
  name: string;
  type: string;
  enum?: string[];
  children: React.ReactNode;
}

export function ResponseField({
  name,
  type,
  enum: enumValues,
  children,
}: ResponseFieldProps) {
  return (
    <div className="border-b border-zinc-850 py-3.5 first:pt-0 last:border-none font-sans">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <code className="font-mono text-sm font-semibold text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/20">
          {name}
        </code>
        <span className="font-mono text-xs text-zinc-400 font-medium">
          {type}
        </span>
        {enumValues && (
          <span className="text-[11px] text-zinc-400 font-mono">
            enum: [{enumValues.map(e => `"${e}"`).join(', ')}]
          </span>
        )}
      </div>
      <div className="text-sm text-zinc-300 leading-relaxed font-sans prose-strong:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

export function ResponseGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-zinc-800 bg-[#0c0c10] p-4 shadow-sm divide-y divide-zinc-800/60">
      {children}
    </div>
  );
}
