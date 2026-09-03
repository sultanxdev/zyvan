import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { HeroDashboardPreview } from '@/components/hero-dashboard-preview';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 md:pt-40 md:pb-20">
      {/* Subtle Glow Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#00DC5A]/10 via-zinc-400/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="flex flex-col items-center text-center gap-5 max-w-4xl mx-auto">
          {/* Version / Launch Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-zinc-800 shadow-xs animate-fade-in">
            <span className="size-2 rounded-full bg-[#00DC5A]" />
            <span className="font-semibold font-mono">zyvan v0.1</span>
            <span className="text-muted-foreground">•</span>
            <span>Reliable webhook delivery</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-extrabold tracking-[-0.035em] text-[#111113] leading-[1.05]">
            Webhooks fail.{' '}
            <span
              className="font-normal text-[#27272A] block sm:inline"
              style={{ fontFamily: "var(--font-serif, 'Newsreader', Georgia, serif)" }}
            >
              Your infrastructure shouldn&apos;t.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-zinc-600 max-w-2xl leading-relaxed font-normal">
            Send once. Zyvan delivers your webhooks, retries failures, and keeps every attempt traceable.
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button size="lg" asChild className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-sm px-6 h-11 shadow-sm font-medium">
              <Link href="/login" className="flex items-center gap-2">
                <span>Start building</span>
                <Icon icon={ArrowRight01Icon} size={16} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="rounded-full border-black/[0.1] bg-white text-zinc-800 hover:bg-zinc-50 text-sm px-6 h-11 font-medium shadow-xs">
              <Link href="/docs" className="flex items-center gap-2">
                <span>Read the docs</span>
              </Link>
            </Button>
          </div>

          {/* 4 Feature Trust Checks */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-zinc-700 font-mono">
            <span className="flex items-center gap-1.5">
              <Icon icon={CheckmarkCircle02Icon} size={15} className="text-[#00DC5A]" />
              Automatic retries
            </span>
            <span className="flex items-center gap-1.5">
              <Icon icon={CheckmarkCircle02Icon} size={15} className="text-[#00DC5A]" />
              HMAC signing
            </span>
            <span className="flex items-center gap-1.5">
              <Icon icon={CheckmarkCircle02Icon} size={15} className="text-[#00DC5A]" />
              Idempotency
            </span>
            <span className="flex items-center gap-1.5">
              <Icon icon={CheckmarkCircle02Icon} size={15} className="text-[#00DC5A]" />
              Delivery history
            </span>
          </div>
        </div>

        {/* Hero Interactive Dashboard Visualizer */}
        <HeroDashboardPreview />
      </div>
    </section>
  );
}
