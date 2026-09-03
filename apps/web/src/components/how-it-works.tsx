'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  FlashIcon,
  ServerIcon,
  ShieldCheckIcon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  ArrowRight01Icon,
  ZapIcon,
  Layers01Icon,
} from '@hugeicons/core-free-icons';

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: '01',
      badge: 'Ingest',
      title: 'Send event once via HTTP',
      subtitle: 'POST /v1/events with idempotency',
      description:
        'Your application fires a standard HTTP POST request. Zyvan guarantees transactional uniqueness with PostgreSQL before returning 202 Accepted in under 15ms.',
      bg: 'bg-[#F0F7FF]',
      border: 'border-[#D9EAFD]',
      accentBg: 'bg-blue-100',
      accentColor: 'text-blue-700',
      pillText: '< 15ms Ingest',
      preview: {
        method: 'POST',
        endpoint: '/v1/events',
        headers: ['Idempotency-Key: inv_99812_pay', 'Authorization: Bearer zyvan_live_***'],
        body: '{\n  "type": "invoice.paid",\n  "tenant_id": "cust_8829",\n  "amount": 14900\n}',
        status: '202 Accepted',
        statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      },
    },
    {
      step: '02',
      badge: 'Queue & Sign',
      title: 'Queued & cryptographically signed',
      subtitle: 'Tenant-isolated AMQP broker',
      description:
        'Events are routed into dedicated RabbitMQ exchanges. Zyvan applies HMAC-SHA256 signatures, validates destination DNS against SSRF attacks, and prepares worker dispatch.',
      bg: 'bg-[#FFF7ED]',
      border: 'border-[#FED7AA]/60',
      accentBg: 'bg-amber-100',
      accentColor: 'text-amber-800',
      pillText: 'HMAC-SHA256 Signed',
      preview: {
        method: 'AMQP',
        endpoint: 'exchange: zyvan.delivery',
        headers: ['X-Zyvan-Signature: v1=a94a8f...', 'SSRF Guard: Validated (Loopback Blocked)'],
        body: '{\n  "delivery_id": "del_01J98FA",\n  "secret_version": "v1_gcm",\n  "attempt": 1\n}',
        status: 'Enqueued',
        statusColor: 'text-amber-700 bg-amber-50 border-amber-200',
      },
    },
    {
      step: '03',
      badge: 'Deliver & Recover',
      title: 'Delivered or auto-retried with DLQ',
      subtitle: 'Zero CPU database polling',
      description:
        'Webhooks deliver directly to endpoints. If your recipient returns 5xx or times out, native RabbitMQ message TTL triggers exponential jitter backoff without dropped events.',
      bg: 'bg-[#F0FDF4]',
      border: 'border-[#BBF7D0]',
      accentBg: 'bg-emerald-100',
      accentColor: 'text-emerald-800',
      pillText: '99.999% Guaranteed',
      preview: {
        method: 'HTTP/1.1',
        endpoint: 'dest.example.com/webhook',
        headers: ['Outcome A: 200 OK -> ✓ Done', 'Outcome B: 504 Timeout -> ↻ Retry (attempt 2/5)'],
        body: '{\n  "delivery_status": "delivered",\n  "latency_ms": 38,\n  "next_retry": "null"\n}',
        status: 'Delivered',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-24 relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <Badge variant="pill" className="mb-3.5 px-3.5 py-1 text-xs text-zinc-600 bg-white/90 border-zinc-200 shadow-xs">
            How It Works
          </Badge>
          <h2
            className="text-3xl sm:text-5xl font-normal tracking-tight text-[#17172B] leading-[1.12]"
            style={{ fontFamily: "var(--font-serif, 'Newsreader', Georgia, serif)" }}
          >
            Send it once.{' '}
            <span className="italic text-[#18181B]">
              Zyvan takes care of the rest.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed max-w-xl mx-auto font-normal">
            A predictable, durable 3-stage delivery pipeline engineered for high-throughput webhook reliability.
          </p>
        </div>

        {/* 3-Step Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {steps.map((s, idx) => (
            <div
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`rounded-[22px] border ${s.border} ${s.bg} p-6 sm:p-7 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] cursor-pointer group`}
            >
              <div>
                {/* Step Pill & Badge */}
                <div className="flex items-center justify-between gap-2 mb-5">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    STEP {s.step}
                  </span>
                  <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${s.accentBg} ${s.accentColor} border border-black/[0.04]`}>
                    {s.pillText}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg sm:text-xl font-bold text-[#17172B] leading-snug">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  {s.description}
                </p>
              </div>

              {/* Realistic Code / Pipeline Simulation Box */}
              <div className="mt-6 rounded-xl border border-black/[0.08] bg-white/95 p-3.5 font-mono text-[11px] shadow-xs">
                {/* Box Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 text-[10.5px]">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                    <span className="size-1.5 rounded-full bg-[#00DC5A]" />
                    <span>{s.preview.method}</span>
                    <span className="text-zinc-400 truncate max-w-[140px]">{s.preview.endpoint}</span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${s.preview.statusColor}`}>
                    {s.preview.status}
                  </span>
                </div>

                {/* Headers Preview */}
                <div className="space-y-0.5 text-zinc-500 text-[10px] pb-2 border-b border-zinc-50">
                  {s.preview.headers.map((h, hIdx) => (
                    <div key={hIdx} className="truncate text-zinc-600">
                      {h}
                    </div>
                  ))}
                </div>

                {/* JSON Body */}
                <pre className="pt-2 text-zinc-700 text-[10.5px] leading-tight overflow-x-auto">
                  {s.preview.body}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Flow Guarantee Pill */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 rounded-full border border-black/[0.06] bg-white/80 px-5 py-2.5 text-xs text-zinc-600 backdrop-blur-md shadow-xs">
            <span className="flex items-center gap-1.5 font-medium text-zinc-900">
              <Icon icon={ShieldCheckIcon} size={15} className="text-[#00DC5A]" />
              PostgreSQL Commit
            </span>
            <span className="text-zinc-300">→</span>
            <span className="flex items-center gap-1.5 font-medium text-zinc-900">
              <Icon icon={ServerIcon} size={15} className="text-amber-600" />
              RabbitMQ Queue
            </span>
            <span className="text-zinc-300">→</span>
            <span className="flex items-center gap-1.5 font-medium text-zinc-900">
              <Icon icon={CheckmarkCircle02Icon} size={15} className="text-emerald-600" />
              Guaranteed Delivery / Auto-Retry
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}