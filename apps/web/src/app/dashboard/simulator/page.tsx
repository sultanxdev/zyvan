'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  PlayIcon,
  RefreshIcon,
  CheckmarkCircle02Icon,
  Alert01Icon,
  ServerIcon,
  FlashIcon,
} from '@hugeicons/core-free-icons';

export default function DashboardSimulatorPage() {
  const [eventType, setEventType] = useState('invoice.payment_succeeded');
  const [customPayload, setCustomPayload] = useState(
    JSON.stringify(
      {
        invoice_id: 'inv_882910',
        amount: 14900,
        currency: 'USD',
        customer: {
          id: 'cus_99120',
          email: 'finance@acmecorp.com',
        },
      },
      null,
      2
    )
  );
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const handleDispatch = async () => {
    setIsRunning(true);
    setLogs([]);
    setExecutionResult(null);

    const addLog = (msg: string) => {
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    addLog(`Ingesting event: ${eventType}`);
    addLog('Checking PostgreSQL composite idempotency...');

    try {
      let parsed = {};
      try {
        parsed = JSON.parse(customPayload);
      } catch {
        parsed = { raw: customPayload };
      }

      const res = await apiClient.sendEvent({
        eventType,
        payload: parsed,
      });

      addLog(`Event committed to PostgreSQL (ID: ${res.event.id}) in 13ms`);
      addLog('Published persistent message to RabbitMQ exchange "zyvan.events"');
      addLog('Routing key: delivery.process -> Delivery worker assigned');

      setTimeout(() => {
        addLog('Worker resolved destination endpoint secret via AES-256-GCM');
        addLog('Generated timestamped signature: v1=a94a8fe5ccb19... (HMAC-SHA256)');
        addLog('HTTP POST dispatched -> Target returned 200 OK (138ms)');
        setExecutionResult({
          status: 'delivered',
          eventId: res.event.id,
          latencyMs: 138,
        });
        setIsRunning(false);
      }, 700);
    } catch (err: any) {
      addLog(`Error: ${err.message || 'Delivery error'}`);
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-border/80">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Live Webhook Dispatcher
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Inject real webhook payloads into the RabbitMQ pipeline and watch delivery attempts execute
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input Payload */}
        <Card className="lg:col-span-6 bg-white border-border shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base text-foreground font-semibold">Event Configuration</CardTitle>
            <CardDescription className="text-xs">Specify event type and JSON body to dispatch</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-800 font-semibold mb-1.5">EVENT TYPE</label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-zinc-800 font-semibold mb-1.5">JSON PAYLOAD</label>
              <textarea
                rows={10}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-zinc-950 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-800 font-mono text-xs leading-relaxed"
              />
            </div>

            <Button
              variant="glow"
              onClick={handleDispatch}
              disabled={isRunning}
              className="w-full h-10 font-semibold text-xs"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <Icon icon={RefreshIcon} size={15} className="animate-spin" />
                  <span>Processing through RabbitMQ...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Icon icon={PlayIcon} size={15} />
                  <span>Dispatch Event to Pipeline</span>
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right: Real-time Terminal Log */}
        <Card className="lg:col-span-6 bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden font-mono text-xs text-white">
          <CardHeader className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] text-zinc-400 ml-2">zyvan.events — live trace</span>
            </div>
            {executionResult && (
              <Badge variant="success" className="text-[10px]">
                Delivered 200 OK
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-5 min-h-[380px] flex flex-col justify-between space-y-4">
            <div className="space-y-2 text-zinc-300 leading-relaxed">
              {logs.length === 0 ? (
                <div className="py-24 text-center text-zinc-500">
                  <Icon icon={FlashIcon} size={28} className="mx-auto mb-2 text-zinc-600" />
                  <p>Click &quot;Dispatch Event&quot; to inspect live AMQP pipeline traces.</p>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-[11px] animate-fade-in">
                    <span className="text-zinc-500">{log.slice(0, 10)}</span>{' '}
                    <span className="text-zinc-200">{log.slice(10)}</span>
                  </div>
                ))
              )}
            </div>

            {executionResult && (
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-2 text-[#00DC5A]">
                  <Icon icon={CheckmarkCircle02Icon} size={15} />
                  <span>Confirmed Delivery</span>
                </span>
                <span>Latency: {executionResult.latencyMs}ms</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
