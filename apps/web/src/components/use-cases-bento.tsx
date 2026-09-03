'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  CheckmarkCircle02Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';

export function UseCasesBento() {
  return (
    <section id="who-is-zyvan-for" className="py-20 sm:py-24 relative overflow-hidden font-geist-mono">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <Badge
            variant="pill"
            className="mb-3.5 px-3.5 py-1 text-xs text-zinc-600 bg-white/90 border-zinc-200 shadow-xs"
          >
            Who is Zyvan for?
          </Badge>
          <h2
            className="text-3xl sm:text-5xl font-normal tracking-tight text-[#17172B] leading-[1.12]"
            style={{ fontFamily: "var(--font-serif, 'Newsreader', Georgia, serif)" }}
          >
            Built for applications that{' '}
            <span className="italic text-[#18181B]">
              rely on webhooks.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Reliable webhook delivery for products, platforms, and services that depend on their integrations working.
          </p>
        </div>

        {/* Bento Grid: 1 Tall Left Card + 2 Stacked Right Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* ============================================================ */}
          {/* CARD 01 — LARGE LEFT TALL CARD (SaaS)                        */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 rounded-[24px] border border-[#E9D5FF]/80 bg-[#F3EAFF] p-7 sm:p-8 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(123,53,240,0.06)] transition-all">
            <div>
              {/* Category & Tags */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="font-mono text-xs font-bold text-purple-700 uppercase tracking-wider">
                  SaaS
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 text-purple-800 border border-purple-200/60 font-medium">
                    Subscriptions
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 text-purple-800 border border-purple-200/60 font-medium">
                    Billing
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 text-purple-800 border border-purple-200/60 font-medium">
                    Integrations
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-2xl font-bold text-[#17172B] leading-snug">
                Reliable webhooks for SaaS.
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                Subscriptions, billing, account changes, and integrations handled without building custom retry logic.
              </p>
            </div>

            {/* Integrated Vertical Flow Visual */}
            <div className="mt-8 rounded-2xl border border-purple-200/60 bg-white/90 p-5 font-mono text-xs shadow-2xs space-y-2.5">
              {/* Node 1: Application */}
              <div className="flex items-center justify-between rounded-xl bg-purple-50/70 border border-purple-100 p-2.5">
                <div className="flex items-center gap-2 text-purple-900 font-semibold text-xs">
                  <span className="size-2 rounded-full bg-purple-600" />
                  <span>Application</span>
                </div>
                <span className="text-[10px] text-purple-600 font-medium">customer.subscribed</span>
              </div>

              {/* Connector Arrow */}
              <div className="flex justify-center text-purple-400 py-0.5">
                <Icon icon={ArrowDown01Icon} size={15} />
              </div>

              {/* Node 2: Zyvan */}
              <div className="flex items-center justify-between rounded-xl bg-zinc-950 text-white p-2.5 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span className="size-2 rounded-full bg-[#00DC5A]" />
                  <span>Zyvan</span>
                </div>
                <span className="text-[10px] text-zinc-400">Signed &amp; Queued</span>
              </div>

              {/* Connector Arrow */}
              <div className="flex justify-center text-purple-400 py-0.5">
                <Icon icon={ArrowDown01Icon} size={15} />
              </div>

              {/* Node 3: Webhook Delivered */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                  <Icon icon={CheckmarkCircle02Icon} size={14} className="text-emerald-600" />
                  <span>Webhook Destination</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                  200 Delivered
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT CONTAINER: CARD 02 & CARD 03 STACKED                   */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 flex flex-col gap-6 justify-between">
            {/* CARD 02 — RIGHT TOP (E-commerce) */}
            <div className="rounded-[24px] border border-[#FED7AA]/80 bg-[#FFF1E6] p-7 sm:p-8 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(234,88,12,0.06)] transition-all flex-1">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-orange-700 uppercase tracking-wider">
                    E-commerce
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-medium">
                    Order Lifecycle
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#17172B] leading-snug">
                  Keep orders moving.
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                  Orders, payments, fulfillment, and inventory notifications delivered reliably.
                </p>
              </div>

              {/* Lightweight Horizontal Visual: Order → Zyvan → Fulfillment */}
              <div className="mt-6 rounded-2xl border border-orange-200/60 bg-white/90 p-4 font-mono text-xs shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="rounded-lg bg-orange-50 border border-orange-100 p-2.5 text-center">
                    <span className="text-[10px] text-orange-600 uppercase font-semibold block">Source</span>
                    <span className="font-bold text-zinc-900 text-xs mt-0.5 block">Order Placed</span>
                  </div>

                  <div className="rounded-lg bg-zinc-950 text-white p-2.5 text-center shadow-xs">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Router</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">Zyvan</span>
                  </div>

                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Destination</span>
                    <span className="font-bold text-emerald-900 text-xs mt-0.5 block">Fulfillment</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 03 — RIGHT BOTTOM (Platforms & internal systems) */}
            <div className="rounded-[24px] border border-[#BBF7D0]/80 bg-[#ECFAF2] p-7 sm:p-8 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(22,163,74,0.06)] transition-all flex-1">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Platforms &amp; Services
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium">
                    Multi-Service
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#17172B] leading-snug">
                  One reliable delivery layer.
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
                  Give customers dependable webhooks and connect your own services without maintaining retry infrastructure.
                </p>
              </div>

              {/* Lightweight Visual: Service A → Zyvan → Service B / C */}
              <div className="mt-6 rounded-2xl border border-emerald-200/60 bg-white/90 p-4 font-mono text-xs shadow-2xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto flex-1 rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-center">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Service A</span>
                    <span className="font-bold text-zinc-900 text-xs mt-0.5 block">Event Publisher</span>
                  </div>

                  <span className="text-zinc-300 font-bold hidden sm:inline">→</span>

                  <div className="w-full sm:w-auto px-4 py-2 rounded-lg bg-zinc-950 text-white text-center shadow-xs">
                    <span className="font-bold text-white text-xs block">Zyvan</span>
                    <span className="text-[9.5px] text-[#00DC5A] block">Multi-tenant</span>
                  </div>

                  <span className="text-zinc-300 font-bold hidden sm:inline">→</span>

                  <div className="w-full sm:w-auto flex-1 space-y-1.5">
                    <div className="rounded bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 flex items-center justify-between text-[10.5px]">
                      <span className="font-medium text-zinc-800">Service B</span>
                      <span className="text-emerald-600 font-semibold">✓ OK</span>
                    </div>
                    <div className="rounded bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 flex items-center justify-between text-[10.5px]">
                      <span className="font-medium text-zinc-800">Service C</span>
                      <span className="text-emerald-600 font-semibold">✓ OK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
