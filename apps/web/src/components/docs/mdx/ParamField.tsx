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
    <div className="border-b border-zinc-850 py-3.5 first:pt-0 last:border-none font-sans">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <code className="font-mono text-sm font-semibold text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/20">
          {name}
        </code>
        <span className="font-mono text-xs text-zinc-400 font-medium">
          {type}
        </span>
        {required ? (
          <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase text-rose-400 tracking-wider">
            Required
          </span>
        ) : (
          <span className="rounded-full bg-zinc-800/60 border border-zinc-700/40 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
            Optional
          </span>
        )}
        {location && (
          <span className="rounded bg-indigo-950/40 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300 uppercase">
            {location}
          </span>
        )}
        {defaultValue && (
          <span className="text-xs text-zinc-500 font-mono">
            default: <code className="text-zinc-400">{defaultValue}</code>
          </span>
        )}
      </div>
      <div className="text-sm text-zinc-300 leading-relaxed font-sans prose-strong:text-zinc-100">
        {children}
      </div>
    </div>
  );
}

export function ParamGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-zinc-800 bg-[#0c0c10] p-4 shadow-sm divide-y divide-zinc-800/60">
      {children}
    </div>
  );
}
