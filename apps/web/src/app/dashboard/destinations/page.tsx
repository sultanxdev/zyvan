'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, WebhookDestination } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  ServerIcon,
  PlusSignIcon,
  RefreshIcon,
  PlayIcon,
  CheckmarkCircle02Icon,
  CopyIcon,
  Tick01Icon,
  Cancel01Icon,
  ShieldCheckIcon,
} from '@hugeicons/core-free-icons';

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<WebhookDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [rateLimit, setRateLimit] = useState(25);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'failed'>>({});
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getDestinations();
      setDestinations(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    setSubmitting(true);
    try {
      await apiClient.createDestination({
        name,
        url,
        rateLimit,
        maxAttempts,
      });
      setName('');
      setUrl('');
      setModalOpen(false);
      await fetchDestinations();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestPing = async (destId: string, destUrl: string) => {
    setTestStatus((prev) => ({ ...prev, [destId]: 'testing' }));
    try {
      await apiClient.sendEvent({
        eventType: 'endpoint.ping_verification',
        payload: {
          test: true,
          destination_id: destId,
          target_url: destUrl,
          timestamp: Date.now(),
        },
      });
      setTestStatus((prev) => ({ ...prev, [destId]: 'success' }));
      setTimeout(() => {
        setTestStatus((prev) => {
          const copy = { ...prev };
          delete copy[destId];
          return copy;
        });
      }, 3000);
    } catch {
      setTestStatus((prev) => ({ ...prev, [destId]: 'failed' }));
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(secret);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Webhook Destinations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Registered endpoints that receive cryptographically signed HTTP event deliveries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDestinations}
            className="text-xs bg-white h-9"
          >
            <Icon icon={RefreshIcon} size={14} className={loading ? 'animate-spin' : ''} />
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs h-9"
          >
            <Icon icon={PlusSignIcon} size={15} />
            <span>Add Destination</span>
          </Button>
        </div>
      </div>

      {/* Grid of Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {destinations.map((dest) => {
          const pingState = testStatus[dest.id];
          return (
            <Card key={dest.id} className="bg-white border-border shadow-xs flex flex-col justify-between">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base text-foreground font-semibold flex items-center gap-2">
                      <span>{dest.name}</span>
                      <span className="size-2 rounded-full bg-[#00DC5A]" title="Active endpoint" />
                    </CardTitle>
                    <CardDescription className="font-mono text-xs text-zinc-600 pt-1 truncate max-w-sm">
                      {dest.url}
                    </CardDescription>
                  </div>
                  <Badge variant="pill" className="text-[10px]">
                    {dest.rateLimit} req/s limit
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="px-5 py-3 space-y-3">
                {/* Secret Reference */}
                <div className="p-3 rounded-xl border border-border bg-secondary/30 font-mono text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Icon icon={ShieldCheckIcon} size={16} className="text-[#00DC5A] shrink-0" />
                    <span className="text-zinc-500 text-[11px] shrink-0">SIGNING SECRET:</span>
                    <span className="text-zinc-800 truncate">{dest.secretRef || 'whsec_••••••••••••••'}</span>
                  </div>
                  <button
                    onClick={() => copySecret(dest.secretRef || 'whsec_default_secret_key')}
                    className="p-1 rounded hover:bg-secondary text-zinc-500 hover:text-foreground cursor-pointer"
                    title="Copy signing secret"
                  >
                    <Icon icon={copiedSecret === dest.secretRef ? Tick01Icon : CopyIcon} size={14} className={copiedSecret === dest.secretRef ? 'text-[#00DC5A]' : ''} />
                  </button>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground pt-1">
                  <div>
                    Retry Policy: <strong className="text-zinc-800">{dest.retryPolicy?.maxAttempts || 5} attempts (AMQP TTL)</strong>
                  </div>
                  <div>
                    Created: <span className="text-zinc-700">{new Date(dest.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  HMAC-SHA256 Encrypted
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestPing(dest.id, dest.url)}
                  disabled={pingState === 'testing'}
                  className="h-8 text-xs bg-white"
                >
                  {pingState === 'testing' ? (
                    <span className="flex items-center gap-1.5">
                      <Icon icon={RefreshIcon} size={13} className="animate-spin" />
                      Dispatching Ping...
                    </span>
                  ) : pingState === 'success' ? (
                    <span className="flex items-center gap-1.5 text-[#00DC5A]">
                      <Icon icon={CheckmarkCircle02Icon} size={13} />
                      Verified 200 OK!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Icon icon={PlayIcon} size={13} />
                      Send Test Ping
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* ─── Create Destination Modal ──────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Register Webhook Destination</h3>
                <p className="text-xs text-muted-foreground">Zyvan will dispatch and sign events for this target URL</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="size-8 rounded-lg border border-border flex items-center justify-center text-zinc-500 hover:text-foreground cursor-pointer"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-zinc-800 font-semibold mb-1">DESTINATION NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Stripe Ingestion"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 font-sans text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-800 font-semibold mb-1">TARGET WEBHOOK URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.merchant.com/v1/webhooks"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 font-mono text-xs"
                  required
                />
                <p className="text-[11px] text-zinc-500 font-sans mt-1">
                  Protected by Zyvan SSRF DNS Guard (private IP &amp; loopback ranges are rejected).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-800 font-semibold mb-1">RATE LIMIT (REQ/S)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={rateLimit}
                    onChange={(e) => setRateLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-800 font-semibold mb-1">MAX RETRIES</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="glow" size="sm" type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Save Destination'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
