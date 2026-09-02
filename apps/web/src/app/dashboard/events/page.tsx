'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, WebhookEvent } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  FlashIcon,
  Search01Icon,
  RefreshIcon,
  CopyIcon,
  Tick01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Alert01Icon,
  RotateRight01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';

export default function EventsLedgerPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'retrying' | 'dead_letter'>('all');
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [replaying, setReplaying] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getEvents();
      setEvents(data);
      if (selectedEvent) {
        const updated = data.find((e) => e.id === selectedEvent.id);
        if (updated) setSelectedEvent(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.eventType.toLowerCase().includes(search.toLowerCase()) ||
      e.idempotencyKey.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleReplay = async (eventId: string) => {
    setReplaying(true);
    try {
      await apiClient.replayEvent(eventId);
      await fetchEvents();
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Events Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Immutable audit record of all incoming events and outbound delivery lineages
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          className="flex items-center gap-1.5 text-xs bg-white self-start sm:self-auto"
        >
          <Icon icon={RefreshIcon} size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Ledger</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Icon icon={Search01Icon} size={16} className="absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, type, or idempotency..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 font-mono"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['all', 'delivered', 'retrying', 'dead_letter'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-zinc-950 text-white font-semibold shadow-xs'
                  : 'bg-white border border-border text-zinc-600 hover:bg-secondary/60'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table Card */}
      <Card className="bg-white border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-secondary/40 border-b border-border text-zinc-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Idempotency Key</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deliveries</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No webhook events found matching current query.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`hover:bg-secondary/30 transition-colors cursor-pointer ${
                        selectedEvent?.id === evt.id ? 'bg-secondary/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-zinc-950">
                        {evt.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-secondary font-semibold text-zinc-800">
                          {evt.eventType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 truncate max-w-[160px]">
                        {evt.idempotencyKey}
                      </td>
                      <td className="py-3.5 px-4">
                        {evt.status === 'delivered' && (
                          <Badge variant="success" className="text-[10px]">200 OK</Badge>
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
                        {evt.deliveries?.length || 1} destination
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className="px-2.5 py-1 rounded bg-secondary hover:bg-zinc-200 text-zinc-900 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Event Slide-Over Inspector Drawer ──────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl bg-white border-l border-border h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-border/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-zinc-950">{selectedEvent.id}</span>
                    {selectedEvent.status === 'delivered' && <Badge variant="success">Delivered</Badge>}
                    {selectedEvent.status === 'retrying' && <Badge variant="warning">AMQP Retrying</Badge>}
                    {selectedEvent.status === 'dead_letter' && <Badge variant="destructive">Moved to DLQ</Badge>}
                  </div>
                  <h3 className="text-lg font-bold text-foreground font-mono">
                    {selectedEvent.eventType}
                  </h3>
                  <p className="text-xs text-muted-foreground pt-1">
                    Received at {new Date(selectedEvent.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="size-8 rounded-lg border border-border flex items-center justify-center text-zinc-500 hover:text-foreground cursor-pointer"
                >
                  <Icon icon={Cancel01Icon} size={16} />
                </button>
              </div>

              {/* Idempotency & Metadata Bar */}
              <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>IDEMPOTENCY KEY:</span>
                  <button
                    onClick={() => handleCopy(selectedEvent.idempotencyKey)}
                    className="flex items-center gap-1 hover:text-foreground cursor-pointer text-zinc-800"
                  >
                    <span>{selectedEvent.idempotencyKey}</span>
                    <Icon icon={copiedKey ? Tick01Icon : CopyIcon} size={13} className={copiedKey ? 'text-[#00DC5A]' : ''} />
                  </button>
                </div>
                <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40">
                  <span>TENANT:</span>
                  <span className="text-zinc-800 font-semibold">{selectedEvent.tenantId}</span>
                </div>
              </div>

              {/* Deliveries & Attempts History */}
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 mb-3">
                  Outbound Deliveries &amp; Execution Attempts
                </h4>
                <div className="space-y-3">
                  {selectedEvent.deliveries?.map((del) => (
                    <div key={del.id} className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-800 font-semibold truncate max-w-[320px]">
                          {del.destinationUrl || 'https://dest.example.com/webhook'}
                        </span>
                        <span className="text-xs font-bold text-zinc-900">
                          {del.attemptCount} Attempt(s)
                        </span>
                      </div>

                      {/* Attempts log stream */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        {del.attempts?.map((att) => (
                          <div
                            key={att.id}
                            className="p-3 rounded-lg border border-border bg-white flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                                {att.outcome === 'success' ? (
                                  <Icon icon={CheckmarkCircle02Icon} size={15} className="text-[#00DC5A]" />
                                ) : (
                                  <Icon icon={Alert01Icon} size={15} className="text-amber-500" />
                                )}
                                Attempt #{att.attemptNo}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  att.statusCode === 200
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                HTTP {att.statusCode}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                              <span>Latency: <strong className="text-zinc-800">{att.latencyMs}ms</strong></span>
                              <span>{new Date(att.startedAt).toLocaleTimeString()}</span>
                            </div>

                            {att.errorMessage && (
                              <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-100 mt-1">
                                {att.errorMessage}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700">
                    Ingested Event Payload
                  </h4>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedEvent.payload, null, 2))}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-mono"
                  >
                    <Icon icon={CopyIcon} size={13} />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-border/80 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEvent(null)}
              >
                Close Inspector
              </Button>

              {selectedEvent.status === 'dead_letter' && (
                <Button
                  variant="glow"
                  size="sm"
                  onClick={() => handleReplay(selectedEvent.id)}
                  disabled={replaying}
                  className="flex items-center gap-1.5"
                >
                  <Icon icon={RotateRight01Icon} size={15} />
                  <span>{replaying ? 'Scheduling Replay...' : 'Replay Webhook (DLQ)'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
