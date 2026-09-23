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
    <div className="border-b border-[#141A17] py-3.5 first:pt-0 last:border-none font-mono text-xs">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <code className="font-mono text-xs font-semibold text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded border border-[#22C55E]/20">
          {name}
        </code>
        <span className="text-xs text-zinc-400 font-medium">
          {type}
        </span>
        {enumValues && (
          <span className="text-[11px] text-zinc-500 font-mono">
            enum: [{enumValues.map((e) => `"${e}"`).join(', ')}]
          </span>
        )}
      </div>
      <div className="text-zinc-300 leading-relaxed space-y-1">
        {children}
      </div>
    </div>
  );
}

export function ResponseGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-4 divide-y divide-[#141A17] font-mono">
      {children}
    </div>
  );
}
