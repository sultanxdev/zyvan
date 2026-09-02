'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  FlashIcon,
  Database01Icon,
  ServerIcon,
  ShieldCheckIcon,
  RotateRight01Icon,
  Alert01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';

const steps = [
  {
    id: 1,
    title: '1. Fast Ingestion',
    short: 'Idempotency Lock',
    icon: FlashIcon,
    badge: 'API Plane',
    tag: 'POST /v1/events',
    summary: 'API receives incoming event, verifies bearer key scope, and queries PostgreSQL for existing idempotency key.',
    code: `// Deduplication Check
const existing = await eventRepo.findByIdempotencyKey(projectId, key);
if (existing) return res.status(200).json({ event_id: existing.id, duplicate: true });`,
  },
  {
    id: 2,
    title: '2. DB Commit',
    short: 'System of Record',
    icon: Database01Icon,
    badge: 'PostgreSQL',
    tag: 'ACID Transaction',
    summary: 'Event and 1-to-N Delivery records are inserted in a single atomic transaction before any network execution.',
    code: `// Atomic multi-delivery insertion
await prisma.$transaction([
  prisma.event.create({ data: eventPayload }),
  ...destinations.map(d => prisma.delivery.create({ data: { eventId, destinationId: d.id } }))
]);`,
  },
  {
    id: 3,
    title: '3. AMQP Dispatch',
    short: 'zyvan.events',
    icon: ServerIcon,
    badge: 'RabbitMQ',
    tag: 'Topic Exchange',
    summary: 'Job is published to durable exchange zyvan.events with routing key delivery.process. Client receives 202 Accepted.',
    code: `// Durable queueing
channel.publish('zyvan.events', 'delivery.process', Buffer.from(JSON.stringify({ deliveryId, eventId })), {
  persistent: true
});
return res.status(202).json({ event_id, status: 'queued' });`,
  },
  {
    id: 4,
    title: '4. Worker & Signing',
    short: 'AES-256 + HMAC',
    icon: ShieldCheckIcon,
    badge: 'Worker Plane',
    tag: 'HMAC-SHA256',
    summary: 'Worker pulls job with prefetch concurrency, decrypts secret using AES-256-GCM, and signs payload with timestamp.',
    code: `// Cryptographic signing
const secret = decryptSecret(dest.secretRef, masterKey);
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac('sha256', secret).update(\`\${timestamp}.\${rawPayload}\`).digest('hex');`,
  },
  {
    id: 5,
    title: '5. Delayed Retry',
    short: 'TTL + DLX Queue',
    icon: RotateRight01Icon,
    badge: 'Retry Engine',
    tag: 'Zero-Polling',
    summary: '5xx errors and timeouts trigger exponential backoff with full jitter. Message waits in zyvan.delivery.retry with message TTL.',
    code: `// RabbitMQ Native Delayed Retry
const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt) + Math.random() * 1000);
channel.publish('zyvan.events', 'delivery.retry', Buffer.from(payload), {
  expiration: String(delay) // DLX routes back when expired
});`,
  },
  {
    id: 6,
    title: '6. DLQ & Replay',
    short: 'Lineage Preserved',
    icon: Alert01Icon,
    badge: 'Dead-Letter',
    tag: 'POST /v1/events/:id/replay',
    summary: 'Exhausted deliveries move to DLQ with full diagnostic history. Replays create fresh deliveries without touching historical attempts.',
    code: `// Safe historical-preserving replay
const newDelivery = await prisma.delivery.create({ data: { eventId, attemptCount: 0 } });
await prisma.replay.create({ data: { eventId, deliveryId: newDelivery.id } });
await publishDeliveryJob({ deliveryId: newDelivery.id, eventId });`,
  },
];

export function ArchitecturePipeline() {
  const [activeStep, setActiveStep] = useState(0);
  const current = steps[activeStep];

  return (
    <section id="architecture" className="py-24 sm:py-32 bg-secondary/30 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="pill" className="mb-4">
            Reliability Pipeline
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            How Zyvan guarantees zero dropped events
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Explore the path of every event from initial ingestion to verified destination delivery, delayed retry, and safe replay.
          </p>
        </div>

        {/* Step Selector Horizontal Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {steps.map((step, idx) => {
            const isSelected = idx === activeStep;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex flex-col items-start p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-md'
                    : 'border-border bg-white text-zinc-900 hover:bg-secondary/70'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`flex size-8 items-center justify-center rounded-lg ${
                      isSelected ? 'bg-zinc-800 text-[#00DC5A]' : 'bg-secondary text-zinc-700'
                    }`}
                  >
                    <Icon icon={step.icon} size={16} />
                  </div>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-zinc-400' : 'text-muted-foreground'}`}>0{step.id}</span>
                </div>
                <div className={`font-semibold text-xs truncate w-full ${isSelected ? 'text-white' : 'text-foreground'}`}>{step.title}</div>
                <div className={`text-[11px] truncate w-full ${isSelected ? 'text-zinc-300' : 'text-muted-foreground'}`}>{step.short}</div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detail Panel */}
        <Card className="border-border bg-white overflow-hidden shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/80">
            {/* Left Narrative Column */}
            <div className="p-6 lg:p-8 lg:col-span-5 flex flex-col justify-between bg-white">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="pill">{current.badge}</Badge>
                  <span className="font-mono text-xs text-zinc-500">{current.tag}</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground tracking-tight">{current.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.summary}</p>
              </div>

              <div className="pt-8 flex items-center justify-between">
                <button
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                >
                  ← Previous Step
                </button>
                <button
                  disabled={activeStep === steps.length - 1}
                  onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                  className="text-xs font-mono text-zinc-950 hover:text-black font-semibold disabled:opacity-30 cursor-pointer flex items-center gap-1"
                >
                  <span>Next Step</span>
                  <Icon icon={ArrowRight01Icon} size={14} />
                </button>
              </div>
            </div>

            {/* Right Code Invariant Column */}
            <div className="p-6 lg:p-8 lg:col-span-7 bg-zinc-950 font-mono text-xs flex flex-col justify-between text-white">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-zinc-400">
                  <span className="text-zinc-300 font-semibold">Engine Code Snippet</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">TypeScript / Invariant</span>
                </div>
                <pre className="text-zinc-200 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {current.code}
                </pre>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Atomic Invariant Enforced</span>
                <span className="text-[#00DC5A]">At-Least-Once Delivery</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
