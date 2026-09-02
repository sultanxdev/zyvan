'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, WebhookDeadLetter } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  Alert01Icon,
  RotateRight01Icon,
  RefreshIcon,
  CheckmarkCircle02Icon,
  ServerIcon,
  ShieldCheckIcon,
} from '@hugeicons/core-free-icons';

export default function DeadLetterQueuePage() {
  const [deadLetters, setDeadLetters] = useState<WebhookDeadLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDLQ = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getDeadLetters();
      setDeadLetters(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDLQ();
  }, []);

  const handleReplay = async (eventId: string) => {
    setReplayingId(eventId);
    setSuccessMessage(null);
    try {
      const res = await apiClient.replayEvent(eventId);
      setSuccessMessage(res.message);
      await fetchDLQ();
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setReplayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dead-Letter Queue (DLQ)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Exhausted event deliveries preserved with full failure diagnostics for safe, non-destructive replay
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDLQ}
          className="text-xs bg-white h-9"
        >
          <Icon icon={RefreshIcon} size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh DLQ</span>
        </Button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Icon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* DLQ Invariant Alert Banner */}
      <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs font-mono text-xs flex items-start gap-3">
        <Icon icon={ShieldCheckIcon} size={20} className="text-[#00DC5A] mt-0.5 shrink-0" />
        <div>
          <strong className="text-zinc-950 font-bold block mb-0.5 font-sans">
            Zero-Overwrite DLQ Guarantee
          </strong>
          <span className="text-muted-foreground leading-relaxed">
            Unlike naive retry tools that overwrite <code className="text-zinc-800 font-bold">attempts = 0</code> and delete error traces, Zyvan preserves all historical attempt records in PostgreSQL and creates a fresh delivery lineage upon replay.
          </span>
        </div>
      </div>

      {/* Dead Letters List */}
      <div className="space-y-4">
        {deadLetters.length === 0 ? (
          <Card className="bg-white border-border shadow-xs py-16 text-center">
            <Icon icon={CheckmarkCircle02Icon} size={40} className="mx-auto mb-3 text-emerald-500" />
            <CardTitle className="text-base text-foreground">DLQ is Empty</CardTitle>
            <CardDescription className="text-xs pt-1">
              All events are successfully delivered or currently retrying in RabbitMQ.
            </CardDescription>
          </Card>
        ) : (
          deadLetters.map((dlq) => (
            <Card key={dlq.id} className="bg-white border-border shadow-xs overflow-hidden">
              <CardContent className="p-5 font-mono text-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-zinc-950">{dlq.eventId}</span>
                    <Badge variant="destructive" className="text-[10px]">
                      {dlq.attemptsCount} Attempts Exhausted
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(dlq.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Icon icon={ServerIcon} size={15} className="text-zinc-500" />
                    <span className="truncate">{dlq.destinationUrl}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50/60 border border-red-200/80 text-red-700 text-xs">
                    <strong>Root Cause:</strong> {dlq.reason}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Action creates new Delivery record linked to {dlq.eventId}
                  </span>

                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => handleReplay(dlq.eventId)}
                    disabled={replayingId === dlq.eventId}
                    className="flex items-center gap-1.5 text-xs h-8 px-4"
                  >
                    <Icon
                      icon={RotateRight01Icon}
                      size={14}
                      className={replayingId === dlq.eventId ? 'animate-spin' : ''}
                    />
                    <span>{replayingId === dlq.eventId ? 'Dispatching...' : 'Replay Webhook'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
