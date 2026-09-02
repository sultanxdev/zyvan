'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  CopyIcon,
  Tick01Icon,
  PlayIcon,
  ShieldCheckIcon,
  FlashIcon,
  ServerIcon,
  Database01Icon,
} from '@hugeicons/core-free-icons';

export function Hero() {
  const [copied, setCopied] = useState(false);

  const curlCode = `curl -X POST https://api.zyvan.dev/v1/events \\
  -H "Authorization: Bearer zyvan_live_e891c..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "invoice.paid",
    "tenant_id": "shop_cust_8829",
    "idempotency_key": "inv_99812_pay",
    "data": { "amount": 14900, "currency": "USD" }
  }'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-grid-pattern">
      {/* Glow Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-6 max-w-4xl mx-auto">
          {/* Version / Launch Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-300 shadow-[0_0_20px_-3px_rgba(99,102,241,0.3)] animate-fade-in">
            <Icon icon={CheckmarkBadge01Icon} size={16} className="text-indigo-400" />
            <span>Zyvan v0.1 Reliability Engine Available</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground flex items-center gap-1">
              At-Least-Once Webhooks <Icon icon={ArrowRight01Icon} size={14} />
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Webhooks fail.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
              Your infrastructure shouldn&apos;t.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Durable event ingestion in 15ms. Asynchronous delivery via RabbitMQ.
            Automatic exponential backoff with jitter, HMAC-SHA256 signing, and zero-overwrite DLQ replay.
          </p>

          {/* Dual Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button variant="glow" size="lg" asChild className="text-base px-8 h-12">
              <Link href="#simulator" className="flex items-center gap-2">
                <span>Test Live Simulator</span>
                <Icon icon={PlayIcon} size={18} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="text-base px-6 h-12">
              <Link href="#architecture" className="flex items-center gap-2">
                <span>View Architecture</span>
                <Icon icon={ArrowRight01Icon} size={18} />
              </Link>
            </Button>
          </div>

          {/* Micro Trust Stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Icon icon={ShieldCheckIcon} size={16} className="text-emerald-400" />
              AES-256-GCM + HMAC-SHA256
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Icon icon={Database01Icon} size={16} className="text-indigo-400" />
              PostgreSQL Commit First
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Icon icon={ServerIcon} size={16} className="text-purple-400" />
              RabbitMQ TTL Retry Queues
            </span>
          </div>
        </div>

        {/* Hero Interactive Terminal / Visualizer */}
        <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-border/80 bg-card/80 backdrop-blur-2xl shadow-2xl shadow-indigo-950/40 overflow-hidden">
          {/* Terminal Window Chrome */}
          <div className="flex items-center justify-between border-b border-border/60 bg-secondary/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-500/80" />
              <span className="size-3 rounded-full bg-amber-500/80" />
              <span className="size-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">zyvan-ingest-pipeline — POST /v1/events</span>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Copy curl command"
            >
              {copied ? (
                <>
                  <Icon icon={Tick01Icon} size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Icon icon={CopyIcon} size={14} />
                  <span>Copy cURL</span>
                </>
              )}
            </button>
          </div>

          {/* Terminal Grid: Left Request / Right Live Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60 font-mono text-xs">
            {/* Left: Client Payload */}
            <div className="p-5 bg-black/40">
              <div className="flex items-center justify-between pb-3 text-muted-foreground border-b border-border/40">
                <span className="font-semibold text-indigo-400">1. Customer Ingestion</span>
                <Badge variant="pill" className="text-[10px]">Idempotency Guard</Badge>
              </div>
              <pre className="pt-3 text-zinc-300 overflow-x-auto leading-relaxed">
{`POST /v1/events HTTP/1.1
Authorization: Bearer zyvan_live_***
Idempotency-Key: inv_99812_pay

{
  "type": "invoice.paid",
  "tenant_id": "shop_cust_8829",
  "data": {
    "invoice_id": "inv_99812",
    "amount": 14900,
    "customer": "acme_corp"
  }
}`}
              </pre>
            </div>

            {/* Right: Zyvan Signed Delivery Output */}
            <div className="p-5 bg-black/20">
              <div className="flex items-center justify-between pb-3 text-muted-foreground border-b border-border/40">
                <span className="font-semibold text-emerald-400">2. Outbound Webhook Call</span>
                <span className="text-[11px] text-emerald-400/90 font-semibold">202 Accepted (14ms)</span>
              </div>
              <pre className="pt-3 text-zinc-300 overflow-x-auto leading-relaxed">
{`HTTP/1.1 POST -> https://dest.example.com/webhook
X-Zyvan-Delivery-Id: del_01J98FA...
X-Zyvan-Event-Id: evt_01J98FA...
X-Zyvan-Timestamp: 1788342416
X-Zyvan-Signature: v1=a94a8fe5ccb19...

[RabbitMQ]: Queued to zyvan.delivery
[Worker]: Decrypted secret via AES-256-GCM
[Status]: Attempt #1 dispatched`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
