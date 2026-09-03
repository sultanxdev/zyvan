import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  ArrowRight01Icon,
  PlayIcon,
  ShieldCheckIcon,
  ServerIcon,
  Database01Icon,
} from '@hugeicons/core-free-icons';
import { HeroDashboardPreview } from '@/components/hero-dashboard-preview';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 md:pt-40 md:pb-24 bg-grid-pattern">
      {/* Subtle Glow Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#00DC5A]/10 via-zinc-400/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="flex flex-col items-center text-center gap-6 max-w-4xl mx-auto">
          {/* Version / Launch Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-zinc-800 shadow-xs animate-fade-in">
            <span className="size-2 rounded-full bg-[#00DC5A]" />
            <span className="font-semibold font-mono">zyvan v0.1</span>
            <span className="text-muted-foreground">•</span>
            <span>At-Least-Once Delivery Engine</span>
            <Icon icon={ArrowRight01Icon} size={14} className="text-muted-foreground" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.08]">
            Webhooks fail.{' '}
            <span className="bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600 bg-clip-text text-transparent">
              Your infrastructure shouldn&apos;t.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Durable event ingestion in 15ms. Asynchronous delivery via RabbitMQ.
            Automatic exponential backoff with jitter, HMAC-SHA256 signing, and zero-overwrite DLQ replay.
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <Button size="lg" asChild className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-sm px-6 h-11 shadow-sm font-medium">
              <Link href="/#features" className="flex items-center gap-2">
                <span>Explore Features</span>
                <Icon icon={ArrowRight01Icon} size={16} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="rounded-full border-black/[0.1] bg-white text-zinc-800 hover:bg-zinc-50 text-sm px-6 h-11 font-medium shadow-xs">
              <Link href="/docs" className="flex items-center gap-2">
                <span>Documentation</span>
                <Icon icon={PlayIcon} size={15} className="text-emerald-600" />
              </Link>
            </Button>
          </div>

          {/* Micro Trust Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5 text-zinc-700">
              <Icon icon={ShieldCheckIcon} size={16} className="text-[#00DC5A]" />
              AES-256-GCM + HMAC-SHA256
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-zinc-700">
              <Icon icon={Database01Icon} size={16} className="text-zinc-900" />
              PostgreSQL Commit First
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-zinc-700">
              <Icon icon={ServerIcon} size={16} className="text-zinc-900" />
              RabbitMQ TTL Retry Queues
            </span>
          </div>
        </div>

        {/* Hero Interactive Dashboard Visualizer */}
        <HeroDashboardPreview />
      </div>
    </section>
  );
}
