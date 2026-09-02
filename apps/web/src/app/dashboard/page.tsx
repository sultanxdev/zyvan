'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient, WebhookEvent, WebhookDestination } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  FlashIcon,
  ServerIcon,
  Database01Icon,
  RotateRight01Icon,
  Alert01Icon,
  PlayIcon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Tick01Icon,
  RefreshIcon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';

export default function DashboardOverviewPage() {
  const { user, project } = useAuth();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [destinations, setDestinations] = useState<WebhookDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evts, dests] = await Promise.all([
        apiClient.getEvents(),
        apiClient.getDestinations(),
      ]);
      setEvents(evts);
      setDestinations(dests);
    } catch {
      // offline fallback handled by apiClient
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickDispatch = async (eventType: string) => {
    setDispatching(true);
    try {
      await apiClient.sendEvent({
        eventType,
        payload: {
          invoice_id: `inv_${Math.floor(100000 + Math.random() * 900000)}`,
          amount: Math.floor(Math.random() * 50000) + 1000,
          currency: 'USD',
          customer_email: user?.email || 'customer@acme.com',
          dispatched_by: user?.name || 'Dashboard Operator',
        },
      });
      setDispatchedSuccess(true);
      setTimeout(() => setDispatchedSuccess(false), 2500);
      await loadData();
    } finally {
      setDispatching(false);
    }
  };

  const totalDelivered = events.filter((e) => e.status === 'delivered').length;
  const totalRetrying = events.filter((e) => e.status === 'retrying').length;
  const totalDlq = events.filter((e) => e.status === 'dead_letter').length;
  const deliveryRate = events.length > 0 ? ((totalDelivered / events.length) * 100).toFixed(1) : '100.0';

  return (
    <div className="space-y-8">
      {/* ─── Top Banner ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Infrastructure Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time event delivery pipeline for <span className="font-semibold text-zinc-950">{project?.name}</span>
          </p>
        </div>

        {/* Live Quick Test Dispatcher */}
        <div className="flex items-center gap-2">
          <Button
            variant="glow"
            size="sm"
            onClick={() => handleQuickDispatch('invoice.payment_succeeded')}
            disabled={dispatching}
            className="flex items-center gap-2 text-xs h-9 px-4"
          >
            {dispatching ? (
              <>
                <Icon icon={RefreshIcon} size={14} className="animate-spin" />
                <span>Queuing in RabbitMQ...</span>
              </>
            ) : dispatchedSuccess ? (
              <>
                <Icon icon={Tick01Icon} size={14} className="text-[#00DC5A]" />
                <span className="text-[#00DC5A]">Dispatched &amp; Persisted!</span>
              </>
            ) : (
              <>
                <Icon icon={PlayIcon} size={14} />
                <span>Trigger Quick Event</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="size-9 p-0 flex items-center justify-center bg-white"
            title="Refresh dashboard state"
          >
            <Icon icon={RefreshIcon} size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* ─── Metric Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingested */}
        <Card className="bg-white border-border shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Events Ingested
            </span>
            <div className="size-8 rounded-lg bg-secondary flex items-center justify-center">
              <Icon icon={FlashIcon} size={16} className="text-zinc-900" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {events.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-700 font-semibold font-mono">100%</span> committed in &lt;15ms
            </p>
          </CardContent>
        </Card>

        {/* Delivery Success Rate */}
        <Card className="bg-white border-border shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Success Rate
            </span>
            <div className="size-8 rounded-lg bg-secondary flex items-center justify-center">
              <Icon icon={CheckmarkCircle02Icon} size={16} className="text-[#00DC5A]" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {deliveryRate}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              At-least-once verified deliveries
            </p>
          </CardContent>
        </Card>

        {/* Active Destinations */}
        <Card className="bg-white border-border shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Configured Endpoints
            </span>
            <div className="size-8 rounded-lg bg-secondary flex items-center justify-center">
              <Icon icon={ServerIcon} size={16} className="text-zinc-900" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {destinations.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              HMAC-SHA256 signed destinations
            </p>
          </CardContent>
        </Card>

        {/* RabbitMQ Queued / Retrying */}
        <Card className="bg-white border-border shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Active DLQ / Retries
            </span>
            <div className="size-8 rounded-lg bg-secondary flex items-center justify-center">
              <Icon icon={RotateRight01Icon} size={16} className="text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight flex items-center gap-2">
              <span>{totalRetrying + totalDlq}</span>
              {totalDlq > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-mono">
                  {totalDlq} in DLQ
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Delayed AMQP TTL + Zero dropped
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Events Ledger ──────────────────────────────── */}
      <Card className="bg-white border-border shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-border/70 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-foreground font-semibold">
              Live Webhook Delivery Stream
            </CardTitle>
            <CardDescription className="text-xs">
              Recent events processed by the durable ingestion and queueing engine
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs h-8 bg-white">
            <Link href="/dashboard/events" className="flex items-center gap-1.5">
              <span>View Full Ledger</span>
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-secondary/40 border-b border-border text-zinc-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Idempotency Key</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.slice(0, 6).map((evt) => {
                  const delivery = evt.deliveries?.[0];
                  return (
                    <tr key={evt.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-zinc-950">
                        {evt.id}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-800">
                        <span className="px-2 py-0.5 rounded bg-secondary font-semibold">
                          {evt.eventType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 truncate max-w-[140px]">
                        {evt.idempotencyKey}
                      </td>
                      <td className="py-3.5 px-4">
                        {evt.status === 'delivered' && (
                          <Badge variant="success" className="text-[10px]">200 Delivered</Badge>
                        )}
                        {evt.status === 'retrying' && (
                          <Badge variant="warning" className="text-[10px]">AMQP Retrying</Badge>
                        )}
                        {evt.status === 'dead_letter' && (
                          <Badge variant="destructive" className="text-[10px]">In DLQ</Badge>
                        )}
                        {evt.status === 'delivering' && (
                          <Badge variant="default" className="text-[10px] bg-zinc-950 text-white">Delivering</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700">
                        {delivery?.attemptCount || 1} attempt
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href="/dashboard/events"
                          className="text-xs text-zinc-900 font-semibold underline underline-offset-2 hover:text-black"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
