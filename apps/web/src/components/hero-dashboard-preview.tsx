'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  DashboardSquare01Icon,
  FlashIcon,
  ServerIcon,
  RefreshIcon,
  Alert01Icon,
  PlayIcon,
  Key01Icon,
  Book01Icon,
  Settings01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';

export function HeroDashboardPreview() {
  const [eventsCount, setEventsCount] = useState(10);
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeTab, setActiveTab] = useState('24h');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const triggerQuickEvent = () => {
    setIsTriggering(true);
    setTimeout(() => {
      setEventsCount((prev) => prev + 1);
      setIsTriggering(false);
    }, 450);
  };

  const chartData = [
    { time: '4pm', delivered: 180, retrying: 8, dlq: 0, height: '24%' },
    { time: '6pm', delivered: 340, retrying: 12, dlq: 0, height: '42%' },
    { time: '8pm', delivered: 190, retrying: 5, dlq: 0, height: '26%' },
    { time: '10pm', delivered: 260, retrying: 9, dlq: 0, height: '34%' },
    { time: '12am', delivered: 220, retrying: 4, dlq: 0, height: '30%' },
    { time: '2am', delivered: 110, retrying: 8, dlq: 1, height: '18%' },
    { time: '4am', delivered: 50, retrying: 2, dlq: 0, height: '10%' },
    { time: '6am', delivered: 70, retrying: 3, dlq: 0, height: '12%' },
    { time: '8am', delivered: 160, retrying: 6, dlq: 0, height: '22%' },
    { time: '10am', delivered: 980, retrying: 15, dlq: 0, height: '94%' },
    { time: '12pm', delivered: 920, retrying: 12, dlq: 0, height: '90%' },
    { time: '2pm', delivered: 540, retrying: 8, dlq: 0, height: '62%' },
  ];

  return (
    <div className="relative mt-12 sm:mt-16 w-full">
      {/* Ambient Diffused Glow */}
      <div className="absolute -inset-1.5 rounded-[28px] bg-gradient-to-b from-[#00DC5A]/15 via-zinc-200/20 to-transparent blur-xl pointer-events-none opacity-80" />

      {/* Main Window Frame */}
      <div className="relative rounded-[24px] border border-black/[0.08] bg-[#FDFDFD] shadow-[0_20px_50px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all text-[#18181B]">
        {/* Top Window Bar */}
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-white/90 px-4 py-3 backdrop-blur-md">
          {/* Left: Window Controls + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50" />
              <span className="size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50" />
              <span className="size-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50" />
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200">
              <div className="size-5 rounded-full bg-black flex items-center justify-center text-white overflow-hidden p-0.5">
                <img src="/logo.png" alt="Zyvan logo" className="size-full object-cover rounded-full" />
              </div>
              <span className="font-semibold text-xs font-mono text-zinc-900">zyvan</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">v0.1</span>
            </div>
          </div>

          {/* Center: Breadcrumbs & Status */}
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
            <span>dashboard</span>
            <span>/</span>
            <span className="text-zinc-900 font-medium">overview</span>
            <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[10px] text-emerald-600 font-sans font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60">
              <span className="size-1.5 rounded-full bg-[#00DC5A] animate-pulse" />
              Live Ingestion
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              asChild
              className="rounded-full bg-black text-white hover:bg-zinc-800 text-xs px-3 h-7 font-medium shadow-xs"
            >
              <Link href="/dashboard" className="flex items-center gap-1.5">
                <Icon icon={PlayIcon} size={11} className="text-[#00DC5A]" />
                <span>Dispatch Event</span>
              </Link>
            </Button>
            <div className="size-7 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 text-xs font-medium" title="Developer Account">
              👾
            </div>
          </div>
        </div>

        {/* Inner Dashboard Body: Sidebar + Main Content */}
        <div className="flex min-h-[580px] bg-[#FAFAFA]">
          {/* Left Mini Sidebar */}
          <aside className="hidden md:flex w-52 flex-col justify-between border-r border-black/[0.06] bg-white p-4 select-none">
            <div className="space-y-4">
              {/* Project Card */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-2.5">
                <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase block">PROJECT</span>
                <div className="flex items-center justify-between gap-1 mt-1">
                  <span className="text-xs font-medium text-zinc-800 truncate">Default Production Proje...</span>
                  <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black text-white font-semibold shrink-0">SCALE</span>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-1 text-xs font-medium">
                <div className="flex items-center gap-2.5 rounded-xl bg-black px-3 py-2 text-white shadow-xs">
                  <Icon icon={DashboardSquare01Icon} size={15} />
                  <span>Overview</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
                  <Icon icon={FlashIcon} size={15} />
                  <span>Events Ledger</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
                  <Icon icon={ServerIcon} size={15} />
                  <span>Destinations</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
                  <Icon icon={Key01Icon} size={15} />
                  <span>API Keys</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
                  <Icon icon={Alert01Icon} size={15} />
                  <span>Dead-Letter Queue</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
                  <Icon icon={PlayIcon} size={15} />
                  <span>Live Simulator</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
                  <Icon icon={Book01Icon} size={15} />
                  <span>Documentation</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
                  <Icon icon={Settings01Icon} size={15} />
                  <span>Settings</span>
                </div>
              </nav>
            </div>

            {/* Bottom Status */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#00DC5A]" />
                AMQP Healthy
              </span>
              <span>v0.1.0</span>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 overflow-hidden">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17172B]">
                  Infrastructure Overview
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                  Real-time webhook delivery for your production project
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerQuickEvent}
                  disabled={isTriggering}
                  className="flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-75"
                >
                  <Icon icon={PlayIcon} size={12} className={isTriggering ? 'animate-spin' : 'text-[#00DC5A]'} />
                  <span>{isTriggering ? 'Ingesting...' : 'Trigger Quick Event'}</span>
                </button>
                <button
                  onClick={() => setEventsCount((prev) => prev + 1)}
                  className="size-8 rounded-full border border-black/[0.08] bg-white flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                  title="Refresh Metrics"
                >
                  <Icon icon={RefreshIcon} size={14} />
                </button>
              </div>
            </div>

            {/* Top 4 KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
              {/* Card 1: Webhooks Received */}
              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden transition-all hover:border-black/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-zinc-500 tracking-wider uppercase font-mono">WEBHOOKS RECEIVED</span>
                  <div className="size-6 rounded-full bg-[#FFF5EB] flex items-center justify-center text-amber-600">
                    <Icon icon={FlashIcon} size={13} />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17172B]">
                    {eventsCount}
                  </span>
                  <p className="mt-1 text-[11px] font-medium text-emerald-600 flex items-center gap-1 font-mono">
                    <span>Stored before delivery</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Delivery Success */}
              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden transition-all hover:border-black/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-zinc-500 tracking-wider uppercase font-mono">DELIVERY SUCCESS</span>
                  <div className="size-6 rounded-full bg-[#F0FDF4] flex items-center justify-center text-emerald-600">
                    <Icon icon={CheckmarkCircle02Icon} size={14} />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17172B]">
                    99.8%
                  </span>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    At-least-once delivery
                  </p>
                </div>
              </div>

              {/* Card 3: Destinations */}
              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden transition-all hover:border-black/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-zinc-500 tracking-wider uppercase font-mono">DESTINATIONS</span>
                  <div className="size-6 rounded-full bg-[#F4F4F5] flex items-center justify-center text-zinc-700">
                    <Icon icon={ServerIcon} size={13} />
                  </div>
                </div>
                <div className="mt-2.5">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17172B]">
                    4
                  </span>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Signed destinations
                  </p>
                </div>
              </div>

              {/* Card 4: Retry Pipeline */}
              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden transition-all hover:border-black/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-zinc-500 tracking-wider uppercase font-mono">RETRY PIPELINE</span>
                  <div className="size-6 rounded-full bg-[#FFF1E6] flex items-center justify-center text-orange-600">
                    <Icon icon={RefreshIcon} size={13} />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17172B]">
                    0 active
                  </span>
                  <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Healthy
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Automatic retries + DLQ
                </p>
              </div>
            </div>

            {/* Bottom 2 Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Event Delivery Throughput (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-semibold text-[#17172B]">
                        Event Delivery Throughput
                      </h3>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        98.52% Success
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-black" />
                          <span>Delivered</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-amber-400" />
                          <span>Retrying</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-full bg-red-500" />
                          <span>DLQ</span>
                        </span>
                      </div>

                      <div className="flex items-center rounded-lg border border-black/[0.08] bg-zinc-100/70 p-0.5 text-[11px] font-mono">
                        <button
                          onClick={() => setActiveTab('24h')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                            activeTab === '24h' ? 'bg-white text-black shadow-xs' : 'text-zinc-500 hover:text-black'
                          }`}
                        >
                          24h
                        </button>
                        <button
                          onClick={() => setActiveTab('7d')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                            activeTab === '7d' ? 'bg-white text-black shadow-xs' : 'text-zinc-500 hover:text-black'
                          }`}
                        >
                          7d
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Real-time delivery distribution through RabbitMQ AMQP exchange
                  </p>
                </div>

                {/* Sub-Metrics Row */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3.5 my-3 rounded-xl bg-zinc-50/80 border border-zinc-200/60 font-mono text-xs">
                  <div>
                    <span className="text-[9.5px] text-zinc-400 uppercase tracking-wider block">DELIVERED</span>
                    <strong className="text-zinc-900 text-sm sm:text-base font-semibold">4,189</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-zinc-400 uppercase tracking-wider block">AMQP RETRIES</span>
                    <strong className="text-amber-600 text-sm sm:text-base font-semibold">62</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-zinc-400 uppercase tracking-wider block">DLQ FAILURES</span>
                    <strong className="text-red-600 text-sm sm:text-base font-semibold">1</strong>
                  </div>
                </div>

                {/* Bar Chart Visualizer */}
                <div className="pt-2">
                  <div className="h-32 sm:h-36 flex items-end gap-1.5 sm:gap-2 px-1">
                    {chartData.map((d, i) => (
                      <div
                        key={i}
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                      >
                        {/* Hover Tooltip */}
                        {hoveredBar === i && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-black px-2 py-1 text-[10px] text-white font-mono shadow-lg whitespace-nowrap z-20 pointer-events-none">
                            {d.time}: {d.delivered} deliv
                          </div>
                        )}

                        {/* Bar Segment */}
                        <div
                          style={{ height: d.height }}
                          className="w-full rounded-t-sm sm:rounded-t-md bg-[#18181B] group-hover:bg-[#00DC5A] transition-all relative overflow-hidden"
                        >
                          {d.retrying > 0 && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time Axis Labels */}
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono pt-2 border-t border-zinc-100">
                    {chartData.map((d, i) => (
                      <span key={i} className={i % 2 !== 0 ? 'hidden sm:inline' : 'inline'}>
                        {d.time}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Ingestion & Queue Latency (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-semibold text-[#17172B]">
                      Ingestion &amp; Queue Latency
                    </h3>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                      p50 &lt; 15ms
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Synchronous write to PostgreSQL + persistent publish to RabbitMQ
                  </p>
                </div>

                {/* Latency Percentiles */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 my-3 rounded-xl bg-zinc-50/80 border border-zinc-200/60 font-mono text-xs">
                  <div>
                    <span className="text-[9.5px] text-zinc-400 uppercase tracking-wider block">P50 MEDIAN</span>
                    <strong className="text-zinc-900 text-sm font-semibold">14ms</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-zinc-400 uppercase tracking-wider block">P95 TAIL</span>
                    <strong className="text-zinc-900 text-sm font-semibold">46ms</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-zinc-400 uppercase tracking-wider block">P99 MAX</span>
                    <strong className="text-zinc-900 text-sm font-semibold">108ms</strong>
                  </div>
                </div>

                {/* Latency Sparkline */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Historical p50 Response Time</span>
                    <span className="font-semibold text-zinc-700">22ms avg</span>
                  </div>
                  <div className="h-16 w-full flex items-center justify-center">
                    <svg viewBox="0 0 280 60" className="w-full h-full stroke-zinc-900 stroke-[2] fill-none">
                      <path
                        d="M 10 40 Q 50 48, 90 35 T 160 22 T 220 30 T 270 42"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Micro Alert Banner */}
                <div className="rounded-xl border border-emerald-200 bg-[#ECFAF2] p-2.5 text-[11.5px] text-[#008F63] font-medium flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#00DC5A] shrink-0" />
                  <span>PostgreSQL write committed before 202 Accepted return</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
