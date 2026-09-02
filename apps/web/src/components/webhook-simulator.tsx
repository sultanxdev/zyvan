'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  PlayIcon,
  RefreshIcon,
  RotateRight01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
  Clock01Icon,
  ShieldCheckIcon,
  ServerIcon,
  FlashIcon,
} from '@hugeicons/core-free-icons';

type Scenario = 'success' | '500_retry' | 'timeout' | 'terminal_404';

interface AttemptLog {
  attemptNo: number;
  statusCode: number;
  latencyMs: number;
  outcome: 'success' | 'failed' | 'timeout' | 'terminal';
  nextRetryMs?: number;
  timestamp: string;
}

export function WebhookSimulator() {
  const [scenario, setScenario] = useState<Scenario>('500_retry');
  const [eventType, setEventType] = useState('invoice.paid');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'queued' | 'delivering' | 'retrying' | 'delivered' | 'dead_letter'>('idle');
  const [attempts, setAttempts] = useState<AttemptLog[]>([]);
  const [deliveryId, setDeliveryId] = useState<string>('del_01J98FA723');
  const [replayCount, setReplayCount] = useState(0);

  const runSimulation = () => {
    setIsRunning(true);
    setAttempts([]);
    setStatus('queued');

    const newDeliveryId = `del_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    setDeliveryId(newDeliveryId);

    // Step 1: Ingestion commit (100ms)
    setTimeout(() => {
      setStatus('delivering');

      // Step 2: Attempt #1
      setTimeout(() => {
        if (scenario === 'success') {
          const log: AttemptLog = {
            attemptNo: 1,
            statusCode: 200,
            latencyMs: 142,
            outcome: 'success',
            timestamp: new Date().toLocaleTimeString(),
          };
          setAttempts([log]);
          setStatus('delivered');
          setIsRunning(false);
        } else if (scenario === '500_retry') {
          const log1: AttemptLog = {
            attemptNo: 1,
            statusCode: 500,
            latencyMs: 310,
            outcome: 'failed',
            nextRetryMs: 2150,
            timestamp: new Date().toLocaleTimeString(),
          };
          setAttempts([log1]);
          setStatus('retrying');

          // Attempt #2 after retry delay
          setTimeout(() => {
            setStatus('delivering');
            setTimeout(() => {
              const log2: AttemptLog = {
                attemptNo: 2,
                statusCode: 200,
                latencyMs: 165,
                outcome: 'success',
                timestamp: new Date().toLocaleTimeString(),
              };
              setAttempts([log1, log2]);
              setStatus('delivered');
              setIsRunning(false);
            }, 600);
          }, 1200);
        } else if (scenario === 'timeout') {
          const log1: AttemptLog = {
            attemptNo: 1,
            statusCode: 504,
            latencyMs: 5000,
            outcome: 'timeout',
            nextRetryMs: 4320,
            timestamp: new Date().toLocaleTimeString(),
          };
          setAttempts([log1]);
          setStatus('retrying');

          setTimeout(() => {
            setStatus('delivering');
            setTimeout(() => {
              const log2: AttemptLog = {
                attemptNo: 2,
                statusCode: 200,
                latencyMs: 220,
                outcome: 'success',
                timestamp: new Date().toLocaleTimeString(),
              };
              setAttempts([log1, log2]);
              setStatus('delivered');
              setIsRunning(false);
            }, 600);
          }, 1200);
        } else if (scenario === 'terminal_404') {
          const log: AttemptLog = {
            attemptNo: 1,
            statusCode: 404,
            latencyMs: 98,
            outcome: 'terminal',
            timestamp: new Date().toLocaleTimeString(),
          };
          setAttempts([log]);
          setStatus('dead_letter');
          setIsRunning(false);
        }
      }, 500);
    }, 300);
  };

  const handleReplay = () => {
    setReplayCount((prev) => prev + 1);
    setScenario('success');
    runSimulation();
  };

  return (
    <section id="simulator" className="py-24 sm:py-32 relative bg-grid-pattern">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="pill" className="mb-4">
            Interactive Testbed
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Live Webhook Delivery Simulator
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Test how Zyvan responds to server outages, timeouts, and 4xx terminal errors in real time.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Controls Configuration Column */}
          <Card className="lg:col-span-5 border-border bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Configure Test Scenario</CardTitle>
              <CardDescription>
                Choose an event payload and simulated target endpoint response.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Type */}
              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-2 font-mono">
                  EVENT TYPE
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['invoice.paid', 'payment.failed', 'user.created', 'order.fulfilled'].map((type) => (
                    <button
                      key={type}
                      disabled={isRunning}
                      onClick={() => setEventType(type)}
                      className={`text-xs font-mono px-3 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                        eventType === type
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                          : 'border-border bg-secondary/50 text-zinc-700 hover:bg-secondary'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Response Behavior */}
              <div>
                <label className="text-xs font-semibold text-zinc-900 block mb-2 font-mono">
                  DESTINATION RESPONSE
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'success', label: '200 OK', desc: 'Instant successful delivery' },
                    { id: '500_retry', label: '500 Server Error', desc: 'Transient failure → RabbitMQ delayed retry' },
                    { id: 'timeout', label: '504 Gateway Timeout', desc: 'Network timeout → Exponential backoff + jitter' },
                    { id: 'terminal_404', label: '404 Not Found', desc: 'Terminal error → Route directly to DLQ' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      disabled={isRunning}
                      onClick={() => setScenario(s.id as Scenario)}
                      className={`w-full flex items-center justify-between text-left p-3 rounded-lg border cursor-pointer transition-all ${
                        scenario === s.id
                          ? 'border-zinc-950 bg-zinc-100/90 shadow-xs'
                          : 'border-border bg-white hover:bg-zinc-50'
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-semibold font-mono ${scenario === s.id ? 'text-zinc-950' : 'text-zinc-800'}`}>{s.label}</div>
                        <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                      </div>
                      <span className={`size-3 rounded-full border ${scenario === s.id ? 'border-zinc-950 bg-zinc-950' : 'border-zinc-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Button */}
              <Button
                variant="glow"
                disabled={isRunning}
                onClick={runSimulation}
                className="w-full h-11 text-sm font-semibold"
              >
                {isRunning ? (
                  <span className="flex items-center gap-2">
                    <Icon icon={RefreshIcon} size={18} className="animate-spin" />
                    Executing Delivery Pipeline...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon icon={PlayIcon} size={18} />
                    Dispatch Test Webhook
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Right Live Execution Window Column */}
          <Card className="lg:col-span-7 border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden font-mono text-white">
            {/* Monitor Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-900/90">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400">Delivery ID:</span>
                <span className="text-[#00DC5A] font-semibold">{deliveryId}</span>
              </div>
              <div>
                {status === 'idle' && <Badge variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-300">Idle — Ready</Badge>}
                {status === 'queued' && <Badge variant="secondary" className="bg-zinc-800 text-white">Queued in RabbitMQ</Badge>}
                {status === 'delivering' && <Badge variant="default" className="bg-zinc-800 text-white">Dispatching HTTP Call</Badge>}
                {status === 'retrying' && <Badge variant="warning">Retrying in AMQP TTL Queue</Badge>}
                {status === 'delivered' && <Badge variant="success">Delivered (2xx OK)</Badge>}
                {status === 'dead_letter' && <Badge variant="destructive">Moved to DLQ</Badge>}
              </div>
            </div>

            {/* Monitor Body */}
            <div className="p-5 space-y-4 text-xs min-h-[360px] flex flex-col justify-between">
              <div className="space-y-3">
                {/* Status Timeline */}
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Icon icon={ServerIcon} size={16} className="text-[#00DC5A]" />
                    Target: https://api.client.com/webhooks
                  </span>
                  <span className="text-[11px] text-zinc-400">HMAC-SHA256 Signed</span>
                </div>

                {/* Attempt Records */}
                {attempts.length === 0 && status === 'idle' && (
                  <div className="py-16 text-center text-muted-foreground">
                    <Icon icon={FlashIcon} size={32} className="mx-auto mb-3 text-indigo-400/40" />
                    <p>Click &quot;Dispatch Test Webhook&quot; to begin simulation.</p>
                  </div>
                )}

                {attempts.map((attempt) => (
                  <div
                    key={attempt.attemptNo}
                    className="p-3.5 rounded-lg border border-border/70 bg-secondary/20 space-y-2 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-2">
                        {attempt.outcome === 'success' ? (
                          <Icon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-400" />
                        ) : (
                          <Icon icon={Alert01Icon} size={16} className="text-amber-400" />
                        )}
                        Attempt #{attempt.attemptNo}
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          attempt.statusCode === 200
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : attempt.statusCode === 500 || attempt.statusCode === 504
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        HTTP {attempt.statusCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                      <div>
                        Latency: <span className="text-white">{attempt.latencyMs}ms</span>
                      </div>
                      <div>
                        Time: <span className="text-white">{attempt.timestamp}</span>
                      </div>
                    </div>

                    {attempt.nextRetryMs && (
                      <div className="pt-2 text-[11px] text-indigo-300 flex items-center gap-1.5 border-t border-border/40">
                        <Icon icon={Clock01Icon} size={14} className="text-indigo-400" />
                        <span>
                          Exponential Backoff Scheduled: Next attempt in {(attempt.nextRetryMs / 1000).toFixed(1)}s with jitter
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* DLQ Replay Prompt */}
              {status === 'dead_letter' && (
                <div className="p-3.5 rounded-lg border border-red-500/30 bg-red-950/20 flex items-center justify-between">
                  <div className="text-[11px] text-red-300">
                    <strong>Delivery Exhausted.</strong> Moved to Dead-Letter Queue.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReplay}
                    className="border-red-500/40 text-xs h-8 hover:bg-red-500/10"
                  >
                    <Icon icon={RotateRight01Icon} size={14} className="mr-1" />
                    Replay Event ({replayCount})
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
