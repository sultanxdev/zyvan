'use client';

import React from 'react';

export function ArchitectureDiagram() {
  return (
    <div className="my-8 rounded-lg border border-[#1B241F] bg-[#070908] p-6 font-mono overflow-x-auto">
      <div className="flex items-center justify-between mb-4 border-b border-[#141A17] pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22C55E] motion-safe:animate-pulse" />
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Zyvan Reliable Ingestion & Delivery Pipeline
          </span>
        </div>
        <span className="text-[11px] text-zinc-500">At-Least-Once Delivery Architecture</span>
      </div>

      <div className="min-w-[680px] py-4">
        {/* Flow Boxes */}
        <div className="grid grid-cols-5 gap-3 items-center text-center text-xs">
          {/* Step 1: Event Ingestion */}
          <div className="rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-3 flex flex-col items-center">
            <span className="text-[#22C55E] text-[10px] font-bold uppercase mb-1">Source</span>
            <span className="font-semibold text-zinc-100">POST /v1/events</span>
            <span className="text-[10px] text-zinc-500 mt-1">Idempotency-Key</span>
          </div>

          {/* Arrow 1 */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 mb-1">Atomic Commit</span>
            <div className="w-full flex items-center">
              <div className="flex-1 h-[1px] bg-[#1B241F]" />
              <span className="text-[#22C55E] text-xs">▶</span>
            </div>
          </div>

          {/* Step 2: Transactional Outbox */}
          <div className="rounded-lg border border-[#22C55E]/30 bg-[#0B0D0C] p-3 flex flex-col items-center shadow-[0_0_12px_rgba(34,197,94,0.1)]">
            <span className="text-[#22C55E] text-[10px] font-bold uppercase mb-1">PostgreSQL</span>
            <span className="font-semibold text-zinc-100">Transactional Outbox</span>
            <span className="text-[10px] text-[#22C55E] mt-1">Confirmed Publisher</span>
          </div>

          {/* Arrow 2 */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-zinc-500 mb-1">AMQP Confirms</span>
            <div className="w-full flex items-center">
              <div className="flex-1 h-[1px] bg-[#1B241F]" />
              <span className="text-[#22C55E] text-xs">▶</span>
            </div>
          </div>

          {/* Step 3: RabbitMQ Queues */}
          <div className="rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-3 flex flex-col items-center">
            <span className="text-blue-400 text-[10px] font-bold uppercase mb-1">Broker</span>
            <span className="font-semibold text-zinc-100">Tiered Queues</span>
            <span className="text-[10px] text-zinc-500 mt-1">10s / 1m / 5m / 15m</span>
          </div>
        </div>

        {/* Vertical Transition to Workers */}
        <div className="flex justify-center my-3">
          <div className="h-6 w-[1px] bg-[#22C55E]/40" />
        </div>

        {/* Bottom Tier: Worker & Outcomes */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          {/* Worker Delivery */}
          <div className="rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-3 flex flex-col items-center">
            <span className="text-[#22C55E] text-[10px] font-bold uppercase mb-1">Worker Service</span>
            <span className="font-semibold text-zinc-100">SSRF-Safe Dispatch</span>
            <span className="text-[10px] text-zinc-500 mt-1">DNS Pinning & HMAC-SHA256</span>
          </div>

          {/* Retry Pipeline */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/10 p-3 flex flex-col items-center">
            <span className="text-amber-400 text-[10px] font-bold uppercase mb-1">Exponential Backoff</span>
            <span className="font-semibold text-zinc-100">Full Jitter Retries</span>
            <span className="text-[10px] text-zinc-500 mt-1">Rate Limits & Concurrency Caps</span>
          </div>

          {/* DLQ */}
          <div className="rounded-lg border border-red-500/30 bg-red-950/10 p-3 flex flex-col items-center">
            <span className="text-red-400 text-[10px] font-bold uppercase mb-1">Terminal State</span>
            <span className="font-semibold text-zinc-100">Dead-Letter Queue</span>
            <span className="text-[10px] text-zinc-500 mt-1">1-Click & Bulk Replay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
