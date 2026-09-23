'use client';

import React from 'react';
import clsx from 'clsx';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiEndpointProps {
  method: HttpMethod | string;
  path: string;
  description?: string;
  baseUrl?: string;
}

const METHOD_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  GET: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  POST: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  PUT: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  PATCH: {
    bg: 'bg-orange-950/40',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
  },
  DELETE: {
    bg: 'bg-red-950/40',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
};

export function ApiEndpoint({
  method,
  path,
  description,
  baseUrl = 'https://api.zyvan.dev',
}: ApiEndpointProps) {
  const normMethod = method.toUpperCase();
  const style = METHOD_STYLES[normMethod] || METHOD_STYLES.GET;

  return (
    <div className="my-6 rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-4 font-mono">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={clsx(
            'rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider border',
            style.bg,
            style.border,
            style.text
          )}
        >
          {normMethod}
        </span>
        <div className="flex items-center gap-1 text-sm text-zinc-100 font-semibold overflow-x-auto">
          <span className="text-zinc-500 select-all">{baseUrl}</span>
          <span className="text-[#22C55E] select-all">{path}</span>
        </div>
      </div>
      {description && (
        <p className="mt-2 text-xs text-zinc-400 border-t border-[#141A17] pt-2">
          {description}
        </p>
      )}
    </div>
  );
}

// Backward-compatible alias
export const EndpointBadge = ApiEndpoint;
