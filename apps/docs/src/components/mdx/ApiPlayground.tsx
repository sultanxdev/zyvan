'use client';

import React from 'react';
import { Terminal } from 'lucide-react';

interface ApiPlaygroundProps {
  endpoint?: string;
  defaultMethod?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
  defaultPayload?: string;
}

export function ApiPlayground({
  endpoint = '/v1/events',
  defaultMethod = 'POST',
}: ApiPlaygroundProps) {
  return (
    <div className="my-6 rounded-lg border border-[#1B241F] bg-[#070908] p-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#141A17] pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#22C55E]" />
          <span className="font-semibold text-zinc-200">Interactive Events Playground</span>
        </div>
        <span className="rounded bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-0.5 text-[10px] text-[#22C55E] uppercase">
          Live Sandbox
        </span>
      </div>
      <div className="flex items-center gap-2 text-zinc-400">
        <span className="rounded bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 text-[11px] text-blue-400 font-bold">
          {defaultMethod}
        </span>
        <code className="text-[#22C55E]">{endpoint}</code>
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">
        Execute real event dispatches against the Zyvan API through the secure documentation proxy.
      </p>
    </div>
  );
}
