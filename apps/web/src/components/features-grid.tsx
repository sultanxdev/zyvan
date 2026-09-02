'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import {
  ServerIcon,
  ShieldCheckIcon,
} from '@hugeicons/core-free-icons';

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 sm:py-24 relative overflow-hidden">
      {/* Aligned with Navbar Width: max-w-[840px] */}
      <div className="mx-auto max-w-[840px] px-4 sm:px-6">
        {/* Editorial Section Header */}
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-14">
          <h2
            className="text-3xl sm:text-4xl font-normal tracking-tight text-[#18181B] leading-[1.15]"
            style={{ fontFamily: "var(--font-serif, 'Newsreader', 'EB Garamond', 'Times New Roman', Georgia, serif)" }}
          >
            Reliable webhooks by default.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 leading-relaxed">
            Guarantee at-least-once delivery, trace every attempt, and handle retries with zero database polling.
          </p>
        </div>

        {/* Bento Grid: 7 Calm Pastel Cards aligned inside 840px */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
          {/* ============================================================ */}
          {/* CARD 1: From incoming event to guaranteed delivery (5 cols) */}
          {/* ============================================================ */}
          <div className="sm:col-span-5 rounded-3xl border border-black/[0.06] p-5 flex flex-col justify-between bg-[#F7ECFF] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(123,53,240,0.06)] transition-all">
            {/* Top Micro-Graphic */}
            <div className="py-2 flex items-center justify-between min-h-[140px]">
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 70 70" className="size-14 drop-shadow-xs">
                  <circle cx="35" cy="35" r="28" fill="#C49BFA" />
                  <ellipse cx="27" cy="32" rx="3" ry="4" fill="#1C152B" />
                  <ellipse cx="43" cy="32" rx="3" ry="4" fill="#1C152B" />
                  <circle cx="28" cy="30" r="1" fill="#FFFFFF" />
                  <circle cx="44" cy="30" r="1" fill="#FFFFFF" />
                  <ellipse cx="22" cy="37" rx="3" ry="2" fill="#E896E2" opacity="0.6" />
                  <ellipse cx="48" cy="37" rx="3" ry="2" fill="#E896E2" opacity="0.6" />
                  <path d="M29 39 Q35 44 41 39" stroke="#1C152B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                </svg>
                <span className="text-[10px] font-mono text-purple-700 bg-white/90 border border-purple-200/80 px-2 py-0.5 rounded-full mt-1.5 shadow-2xs">
                  #post_event
                </span>
              </div>

              <div className="flex-1 ml-3 bg-white/95 rounded-xl p-3 border border-purple-100/90 shadow-2xs text-[11px] font-mono">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 text-zinc-900 font-semibold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    202 OK
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">3ms</span>
                </div>
                <div className="pt-1.5 space-y-1 text-zinc-600 text-[10px]">
                  <div className="flex justify-between">
                    <span>idempotent:</span>
                    <span className="text-purple-700 font-semibold truncate max-w-[65px]">inv_8829</span>
                  </div>
                  <div className="flex justify-between">
                    <span>postgres:</span>
                    <span className="text-zinc-800">persisted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Copy */}
            <div className="mt-3">
              <h3 className="text-lg font-semibold tracking-tight leading-snug">
                <span className="block text-[#7B35F0]">From incoming event</span>
                <span className="block text-[#17152A]">to guaranteed delivery</span>
              </h3>
              <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                Persist events to PostgreSQL with composite uniqueness before queuing. Zero duplicate deliveries or dropped payloads.
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 2: Zero polling delayed retries (7 cols)               */}
          {/* ============================================================ */}
          <div className="sm:col-span-7 rounded-3xl border border-black/[0.06] p-5 flex flex-col justify-between bg-[#F0F9FF] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(2,132,199,0.06)] transition-all">
            {/* Top Micro-Graphic (Chat Dialogue) */}
            <div className="py-2 flex flex-col gap-2 min-h-[140px] justify-center">
              <div className="flex items-center justify-end gap-1.5">
                <div className="rounded-xl rounded-tr-xs bg-sky-600 text-white px-3 py-1.5 text-xs font-medium shadow-2xs">
                  Endpoint returned 504 Gateway Timeout
                </div>
                <span className="size-6 rounded-full bg-sky-200 text-sky-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                  504
                </span>
              </div>

              <div className="flex items-center gap-2">
                <svg viewBox="0 0 50 50" className="size-7 shrink-0">
                  <circle cx="25" cy="25" r="20" fill="#38BDF8" />
                  <ellipse cx="20" cy="23" rx="2.5" ry="3" fill="#0C4A6E" />
                  <ellipse cx="30" cy="23" rx="2.5" ry="3" fill="#0C4A6E" />
                  <path d="M21 29 Q25 33 29 29" stroke="#0C4A6E" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                <div className="rounded-xl rounded-tl-xs bg-white/95 border border-sky-100 text-zinc-800 px-3 py-1.5 text-xs font-medium shadow-2xs">
                  Enqueued in RabbitMQ DLX. Retry in 4s (attempt 1/5).
                </div>
              </div>

              <div className="self-end bg-white/90 border border-sky-100 rounded-lg px-3 py-1 text-[11px] flex items-center gap-2 shadow-2xs mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-700">Attempt 2: 200 OK</span>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-500 font-mono">38ms</span>
              </div>
            </div>

            {/* Bottom Copy */}
            <div className="mt-3">
              <h3 className="text-lg font-semibold tracking-tight leading-snug">
                <span className="block text-sky-600">Zero polling</span>
                <span className="block text-[#17152A]">delayed retries.</span>
              </h3>
              <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                Native AMQP message TTL and Dead-Letter Exchanges replace CPU-heavy SQL polling. Failures retry with zero DB burn.
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 3: Adapts to every destination (4 cols)                 */}
          {/* ============================================================ */}
          <div className="sm:col-span-4 rounded-3xl border border-black/[0.06] p-5 flex flex-col justify-between bg-[#FFF5EB] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(234,88,12,0.06)] transition-all">
            <div className="py-2 flex items-center justify-center min-h-[130px]">
              <div className="relative size-28 flex items-center justify-center">
                <svg className="absolute inset-0 size-full text-orange-300" viewBox="0 0 112 112">
                  <line x1="56" y1="56" x2="16" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="56" y1="56" x2="96" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="56" y1="56" x2="16" y2="92" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="56" y1="56" x2="96" y2="92" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                </svg>
                <div className="relative z-10 size-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                  <Icon icon={ServerIcon} size={16} />
                </div>
                <span className="absolute top-0 left-0 bg-white border border-orange-100 rounded-full px-1.5 py-0.2 text-[9px] font-medium text-zinc-700 shadow-2xs">
                  Stripe
                </span>
                <span className="absolute top-0 right-0 bg-white border border-orange-100 rounded-full px-1.5 py-0.2 text-[9px] font-medium text-zinc-700 shadow-2xs">
                  CRM
                </span>
                <span className="absolute bottom-0 left-0 bg-white border border-orange-100 rounded-full px-1.5 py-0.2 text-[9px] font-medium text-zinc-700 shadow-2xs">
                  Microservice
                </span>
                <span className="absolute bottom-0 right-0 bg-white border border-orange-100 rounded-full px-1.5 py-0.2 text-[9px] font-medium text-zinc-700 shadow-2xs">
                  Slack
                </span>
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-base font-semibold tracking-tight leading-snug">
                <span className="block text-[#EA580C]">Adapts to</span>
                <span className="block text-[#17152A]">every destination.</span>
              </h3>
              <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                Custom HMAC signatures, headers, and individual timeout policies per destination.
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 4: Engineered for 99.99% deliverability (4 cols)        */}
          {/* ============================================================ */}
          <div className="sm:col-span-4 rounded-3xl border border-black/[0.06] p-5 flex flex-col justify-between bg-[#F0FDF4] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(22,163,74,0.06)] transition-all">
            <div className="py-2 flex flex-col justify-end min-h-[130px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500 font-medium">Deliverability</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded-full">
                  99.99% SLA
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <svg viewBox="0 0 50 50" className="size-11 shrink-0">
                  <circle cx="25" cy="27" r="19" fill="#4ADE80" />
                  <ellipse cx="19" cy="24" rx="2" ry="3" fill="#064E3B" />
                  <ellipse cx="31" cy="24" rx="2" ry="3" fill="#064E3B" />
                  <path d="M21 30 Q25 35 29 30" stroke="#064E3B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                </svg>
                <div className="flex-1 flex items-end justify-between h-14 gap-1 px-1.5 bg-white/80 rounded-lg p-1.5 border border-emerald-100">
                  <div className="w-full bg-emerald-200 rounded-t h-[40%]" />
                  <div className="w-full bg-emerald-300 rounded-t h-[60%]" />
                  <div className="w-full bg-emerald-400 rounded-t h-[75%]" />
                  <div className="w-full bg-emerald-500 rounded-t h-[88%]" />
                  <div className="w-full bg-emerald-600 rounded-t h-[98%]" />
                </div>
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-base font-semibold tracking-tight leading-snug">
                <span className="block text-emerald-600">Engineered for</span>
                <span className="block text-[#17152A]">99.99% reliability.</span>
              </h3>
              <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                Real-time metrics, automated DLQ routing, and jitter backoff protect from drops.
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 5: Fortified security at every step (4 cols)            */}
          {/* ============================================================ */}
          <div className="sm:col-span-4 rounded-3xl border border-black/[0.06] p-5 flex flex-col justify-between bg-[#F5F0FF] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(124,58,237,0.06)] transition-all">
            <div className="py-2 flex items-center justify-between min-h-[130px] gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-1.5 bg-white/90 rounded-lg px-2 py-1 border border-purple-100 text-[10px] text-zinc-700 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-purple-500" />
                  <span>SSRF DNS Guard</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/90 rounded-lg px-2 py-1 border border-purple-100 text-[10px] text-zinc-700 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <span>AES-256 Secrets</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/90 rounded-lg px-2 py-1 border border-purple-100 text-[10px] text-zinc-700 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>HMAC-SHA256</span>
                </div>
              </div>
              <div className="size-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Icon icon={ShieldCheckIcon} size={22} />
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-base font-semibold tracking-tight leading-snug">
                <span className="block text-[#7C3AED]">Fortified security</span>
                <span className="block text-[#17152A]">at every step.</span>
              </h3>
              <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                DNS validation blocks loopback attacks and cloud IAM metadata theft (169.254.169.254).
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 6: Inspect, debug, and replay instantly (7 cols)        */}
          {/* ============================================================ */}
          <div className="sm:col-span-7 rounded-3xl border border-black/[0.06] p-5 flex flex-col justify-between bg-[#F0F7FF] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(2,132,199,0.06)] transition-all">
            <div className="py-2 flex items-center justify-between min-h-[130px]">
              <div className="flex flex-col gap-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 border border-sky-100 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-sky-500" />
                  <span>Live payload preview</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 border border-sky-100 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-purple-500" />
                  <span>Share trace link</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 border border-sky-100 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>1-click replay delivery</span>
                </div>
              </div>

              <div className="relative shrink-0 pr-3">
                <svg viewBox="0 0 120 60" className="w-28 h-14 text-sky-500">
                  <path
                    d="M10 35 C 40 35, 70 20, 100 22"
                    fill="none"
                    stroke="#BAE6FD"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <g transform="translate(80, 8)">
                    <path
                      d="M0 20 L30 4 L15 28 L9 21 Z"
                      fill="#0284C7"
                      stroke="#0369A1"
                      strokeWidth="1.2"
                    />
                    <path d="M9 21 L15 28 L17 18 Z" fill="#38BDF8" />
                  </g>
                </svg>
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-lg font-semibold tracking-tight leading-snug">
                <span className="block text-sky-600">Inspect, debug,</span>
                <span className="block text-[#17152A]">and replay instantly.</span>
              </h3>
              <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                Full attempt traces, raw headers, payload diffs, and safe manual replays with zero overwrite of historical attempts.
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CARD 7: Sub-millisecond throughput scale (5 cols)            */}
          {/* ============================================================ */}
          <div className="sm:col-span-5 rounded-3xl border border-black/[0.06] p-5 flex flex-col justify-between bg-[#F7FEE7] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(77,124,15,0.06)] transition-all">
            <div className="py-2 flex flex-col justify-between min-h-[130px]">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-lime-200 px-2.5 py-0.5 text-[11px] font-semibold text-lime-800 shadow-2xs self-start">
                <span>★</span>
                <span>Sub-millisecond pipeline</span>
              </div>

              <div className="bg-white/80 rounded-xl p-2.5 border border-lime-200/70 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] text-lime-900 font-medium mb-1">
                  <span>Worker Concurrency</span>
                  <span className="font-mono font-bold text-lime-700">10,000 req/s</span>
                </div>
                <div className="w-full bg-lime-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-lime-600 h-1.5 rounded-full w-[85%]" />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-lg font-semibold tracking-tight leading-snug">
                <span className="block text-[#4D7C0F]">Sub-millisecond</span>
                <span className="block text-[#17152A]">throughput scale.</span>
              </h3>
              <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                Channel-bounded worker prefetch and non-blocking I/O ingest thousands of webhooks per second without memory leaks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
