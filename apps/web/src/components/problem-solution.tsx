import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
  ShieldCheckIcon,
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Why building webhook infrastructure in-house is a trap
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            A simple <code className="text-zinc-950 font-semibold font-mono bg-secondary px-1.5 py-0.5 rounded">fetch()</code> in a background job works until destination servers start timing out, crashing your workers and dropping customer billing events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: DIY In-House Webhooks (The Pain) */}
          <Card className="border-red-200 bg-white relative overflow-hidden shadow-xs">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl pointer-events-none" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="destructive">
                  Without Zyvan
                </Badge>
                <Icon icon={Alert01Icon} size={18} className="text-red-500" />
              </div>
              <CardTitle className="text-xl pt-2 text-foreground">DIY HTTP Calls & Cron Loops</CardTitle>
              <CardDescription>
                How typical SaaS apps start — and how they inevitably lose mission-critical customer data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 mt-0.5 border border-red-100">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">Dropped Events on Node Crashes</strong>
                  Events held only in memory or naive queues vanish if a pod restarts during delivery.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 mt-0.5 border border-red-100">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">Destructive Overwrite of Logs</strong>
                  Updating <code className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded text-zinc-900">attempts_count</code> directly erases the original HTTP response codes and error traces.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 mt-0.5 border border-red-100">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">Database Polling Lock Contention</strong>
                  Running <code className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded text-zinc-900">SELECT * FROM jobs WHERE retry_at &lt;= NOW()</code> burns database CPU and locks tables.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 mt-0.5 border border-red-100">
                  <Icon icon={Cancel01Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">Zero SSRF Protection</strong>
                  Users can register <code className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded text-zinc-900">http://169.254.169.254</code> to exfiltrate cloud IAM credentials from your workers.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: With Zyvan (The Solution) */}
          <Card className="border-zinc-950 bg-white shadow-xl ring-1 ring-zinc-950 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#00DC5A]/10 blur-3xl pointer-events-none" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="bg-zinc-950 text-white">
                  With Zyvan
                </Badge>
                <Icon icon={ShieldCheckIcon} size={18} className="text-[#00DC5A]" />
              </div>
              <CardTitle className="text-xl pt-2 text-foreground">Engineered Webhook Reliability Core</CardTitle>
              <CardDescription>
                Guaranteed at-least-once delivery, zero data loss, and complete operational visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mt-0.5 border border-emerald-100">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">PostgreSQL Commit First, Queue Second</strong>
                  Events are persisted in PostgreSQL with composite idempotency before returning 202 Accepted.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mt-0.5 border border-emerald-100">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">RabbitMQ TTL + DLX Delayed Retries</strong>
                  Zero polling overhead. Transient failures wait in a message TTL queue and re-enter automatically.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mt-0.5 border border-emerald-100">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">Immutable Attempt History & Safe Replays</strong>
                  Every outbound attempt records status, headers, and latency. Replays create fresh delivery lineages.
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-zinc-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 mt-0.5 border border-emerald-100">
                  <Icon icon={CheckmarkCircle02Icon} size={14} />
                </span>
                <div>
                  <strong className="text-foreground block font-semibold">True SSRF DNS Guard + AES-256-GCM Secrets</strong>
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
