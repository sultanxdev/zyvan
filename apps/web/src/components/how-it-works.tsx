'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  CheckmarkCircle02Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24 relative overflow-hidden font-geist-mono">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <Badge variant="pill" className="mb-3.5 px-3.5 py-1 text-xs text-zinc-600 bg-white/90 border-zinc-200 shadow-xs">
            How It Works
          </Badge>
          <h2
            className="text-3xl sm:text-5xl font-normal tracking-tight text-[#17172B] leading-[1.12]"
            style={{ fontFamily: "var(--font-serif, 'Newsreader', Georgia, serif)" }}
          >
            Send once.{' '}
            <span className="italic text-[#18181B]">
              Zyvan handles the rest.
            </span>
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Your app sends a webhook to Zyvan. Zyvan delivers it to your server and tries again when something goes wrong.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="space-y-6">
          {/* Top Flow Card: Visual Diagram */}
          <div className="rounded-[22px] border border-black/[0.08] bg-white/80 backdrop-blur-md p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            {/* Visual Node Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Node 1: Your App */}
              <div className="rounded-xl border border-blue-200/80 bg-[#F0F7FF] p-4 text-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-semibold block mb-1">
                  Source
                </span>
                <span className="font-semibold text-sm sm:text-base text-zinc-900 block">
                  Your App
                </span>
                <span className="text-xs text-zinc-500 font-mono mt-1 block">
                  Send webhook
                </span>
              </div>

              {/* Node 2: Zyvan Engine */}
              <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 text-center text-white shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
                  Engine
                </span>
                <span className="font-bold text-sm sm:text-base block">
                  Zyvan
                </span>
                <span className="text-xs text-zinc-400 font-mono mt-1 block">
                  Store &amp; Sign
                </span>
              </div>

              {/* Node 3: Your Server */}
              <div className="rounded-xl border border-amber-200/80 bg-[#FFF7ED] p-4 text-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-semibold block mb-1">
                  Destination
                </span>
                <span className="font-semibold text-sm sm:text-base text-zinc-900 block">
                  Your Server
                </span>
                <span className="text-xs text-zinc-500 font-mono mt-1 block">
                  Receive webhook
                </span>
              </div>

              {/* Node 4: Dual Outcomes (Works / Retry) */}
              <div className="space-y-2">
                {/* Works Outcome */}
                <div className="rounded-lg border border-emerald-200 bg-[#F0FDF4] px-3.5 py-2 flex items-center justify-between text-xs font-mono text-emerald-800">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Icon icon={CheckmarkCircle02Icon} size={14} className="text-emerald-600" />
                    Works
                  </span>
                  <span className="text-[11px] font-medium bg-emerald-100/80 px-2 py-0.5 rounded text-emerald-700">
                    Done (200 OK)
                  </span>
                </div>

                {/* Fails Outcome */}
                <div className="rounded-lg border border-purple-200 bg-[#FAF5FF] px-3.5 py-2 flex items-center justify-between text-xs font-mono text-purple-800">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Icon icon={RefreshIcon} size={14} className="text-purple-600" />
                    Fails
                  </span>
                  <span className="text-[11px] font-medium bg-purple-100/80 px-2 py-0.5 rounded text-purple-700">
                    Auto-Retry
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bento 3-Grid: STEP 01, STEP 02, STEP 03 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* STEP 01 */}
            <div className="rounded-[22px] border border-[#D9EAFD] bg-[#F0F7FF] p-6 sm:p-7 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    STEP 01
                  </span>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200/60">
                    01 Send
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#17172B] leading-snug">
                  Send your webhook
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                  Send your webhook to Zyvan with a simple HTTP request. We store it before delivery begins.
                </p>
              </div>

              {/* Small UI */}
              <div className="mt-6 rounded-xl border border-black/[0.08] bg-white p-3.5 font-mono text-xs shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900">POST /v1/events</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                    202 Accepted
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-100 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#00DC5A]" />
                  <span>Stored before delivery</span>
                </div>
              </div>
            </div>

            {/* STEP 02 */}
            <div className="rounded-[22px] border border-[#FED7AA]/60 bg-[#FFF7ED] p-6 sm:p-7 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    STEP 02
                  </span>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/60">
                    02 Deliver
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#17172B] leading-snug">
                  Zyvan prepares delivery
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                  Zyvan queues the request, signs it, and prepares it for delivery.
                </p>
              </div>

              {/* Small UI */}
              <div className="mt-6 rounded-xl border border-black/[0.08] bg-white p-3.5 font-mono text-xs shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-800 font-medium text-[11px]">
                  <Icon icon={CheckmarkCircle02Icon} size={14} className="text-emerald-600" />
                  <span>Queued</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-800 font-medium text-[11px]">
                  <Icon icon={CheckmarkCircle02Icon} size={14} className="text-emerald-600" />
                  <span>Signed</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-800 font-medium text-[11px]">
                  <Icon icon={CheckmarkCircle02Icon} size={14} className="text-emerald-600" />
                  <span>Ready</span>
                </div>
              </div>
            </div>

            {/* STEP 03 */}
            <div className="rounded-[22px] border border-[#BBF7D0] bg-[#F0FDF4] p-6 sm:p-7 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    STEP 03
                  </span>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                    03 Recover
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#17172B] leading-snug">
                  Delivered or tried again
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                  Your server receives the webhook. If delivery fails, Zyvan automatically tries again.
                </p>
              </div>

              {/* Small UI */}
              <div className="mt-6 rounded-xl border border-black/[0.08] bg-white p-3.5 font-mono text-xs shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-800 font-semibold text-[11.5px]">200 OK</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                    → Delivered
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                  <span className="text-zinc-800 font-semibold text-[11.5px]">504</span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200 text-[11px]">
                    → Retry
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}