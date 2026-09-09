'use client';

import React, { useState } from 'react';
import { Copy, Check, Lock } from 'lucide-react';

interface EndpointBadgeProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  auth?: string;
  baseUrl?: string;
}

export function EndpointBadge({
  method,
  path,
  auth = 'Bearer API Key',
  baseUrl = 'https://api.zyvan.dev',
}: EndpointBadgeProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${baseUrl}${path}`;

  const methodColors = {
    GET: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    POST: 'bg-[#00DC5A]/10 text-[#00DC5A] border-[#00DC5A]/30',
    PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="my-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-zinc-950 p-3 backdrop-blur-md shadow-lg font-geist-mono font-mono">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
            methodColors[method] || methodColors.GET
          }`}
        >
          {method}
        </span>
        <span className="text-sm font-semibold text-zinc-100">{path}</span>
      </div>

      <div className="flex items-center gap-2.5">
        {auth && (
          <div className="flex items-center gap-1.5 rounded-md bg-zinc-900 border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400">
            <Lock className="w-3 h-3 text-zinc-500" />
            <span>{auth}</span>
          </div>
        )}
        <button
          onClick={handleCopy}
          aria-label="Copy endpoint URL"
          className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[#00DC5A]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
