import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
  ShieldSecurityIcon,
  ServerIcon,
  RotateRight01Icon,
} from '@hugeicons/core-free-icons';

export function ProblemSolution() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="pill" className="mb-4">
            The Reality Check
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Why building webhook infrastructure in-house is a trap
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            A simple <code className="text-indigo-400 font-mono">fetch()</code> in a background job works until destination servers start timing out, crashing your workers and dropping customer billing events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: DIY In-House Webhooks (The Pain) */}
          <Card className="border-red-500/20 bg-gradient-to-b from-red-950/10 via-card to-card/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl pointer-events-none" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20">
                  Without Zyvan
                </Badge>
                <Icon icon={Alert01Icon} size={18} className="text-red-400" />
              </div>
              <CardTitle className="text-xl pt-2">DIY HTTP Calls & Cron Loops</CardTitle>
              <CardDescription>
                How typical SaaS apps start — and how they inevitably lose mission-critical customer data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 mt-0.5">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">Dropped Events on Node Crashes</strong>
                  Events held only in memory or naive queues vanish if a pod restarts during delivery.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 mt-0.5">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">Destructive Overwrite of Logs</strong>
                  Updating <code className="font-mono text-xs">attempts_count</code> directly erases the original HTTP response codes and error traces.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 mt-0.5">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">Database Polling Lock Contention</strong>
                  Running <code className="font-mono text-xs">SELECT * FROM jobs WHERE retry_at &lt;= NOW()</code> burns database CPU and locks tables.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400 mt-0.5">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">Zero SSRF Protection</strong>
                  Users can register <code className="font-mono text-xs">http://169.254.169.254</code> to exfiltrate cloud IAM credentials from your workers.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: With Zyvan (The Solution) */}
          <Card className="border-indigo-500/40 bg-gradient-to-b from-indigo-950/20 via-card to-card/80 shadow-[0_0_35px_-10px_rgba(99,102,241,0.2)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-3xl pointer-events-none" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="pill" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  With Zyvan
                </Badge>
                <Icon icon={ShieldSecurityIcon} size={18} className="text-indigo-400" />
              </div>
              <CardTitle className="text-xl pt-2">Engineered Webhook Reliability Core</CardTitle>
              <CardDescription>
                Guaranteed at-least-once delivery, zero data loss, and complete operational visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">PostgreSQL Commit First, Queue Second</strong>
                  Events are persisted in PostgreSQL with composite idempotency before returning 202 Accepted.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">RabbitMQ TTL + DLX Delayed Retries</strong>
                  Zero polling overhead. Transient failures wait in a message TTL queue and re-enter automatically.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">Immutable Attempt History & Safe Replays</strong>
                  Every outbound attempt records status, headers, and latency. Replays create fresh delivery lineages.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-white block">True SSRF DNS Guard + AES-256-GCM Secrets</strong>
                  Resolves DNS to block private IP ranges and cloud metadata. Secrets encrypted at rest.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
