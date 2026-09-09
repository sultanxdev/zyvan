'use client';

import React from 'react';

interface ParamFieldProps {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  location?: 'body' | 'path' | 'query' | 'header';
  children: React.ReactNode;
}

export function ParamField({
  name,
  type,
  required = false,
  defaultValue,
  location,
  children,
}: ParamFieldProps) {
  return (
    <div className="border-b border-zinc-800 py-3.5 first:pt-0 last:border-none font-geist-mono font-mono">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <code className="font-mono text-xs font-semibold text-[#00DC5A] bg-[#00DC5A]/10 px-1.5 py-0.5 rounded border border-[#00DC5A]/20">
          {name}
        </code>
        <span className="text-xs text-zinc-400 font-medium">
          {type}
        </span>
        {required ? (
          <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-semibold uppercase text-rose-400 tracking-wider">
            Required
          </span>
        ) : (
          <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400">
            Optional
          </span>
        )}
        {location && (
          <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300 uppercase">
            {location}
          </span>
        )}
        {defaultValue && (
          <span className="text-xs text-zinc-500">
            default: <code className="text-zinc-400">{defaultValue}</code>
          </span>
        )}
      </div>
      <div className="text-sm text-zinc-300 leading-relaxed prose-strong:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

export function ParamGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-white/[0.08] bg-[#0A0A0E] p-4 shadow-sm divide-y divide-zinc-800/80 font-geist-mono font-mono">
      {children}
    </div>
  );
}
