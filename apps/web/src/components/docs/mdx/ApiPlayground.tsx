'use client';

import React, { useState } from 'react';
import { Play, RotateCcw, Sparkles } from 'lucide-react';

interface ApiPlaygroundProps {
  defaultMethod?: 'POST' | 'GET' | 'PUT' | 'DELETE';
  endpoint?: string;
  defaultPayload?: string;
  sampleResponse?: Record<string, unknown>;
}

export function ApiPlayground({
  defaultMethod = 'POST',
  endpoint = '/v1/projects/proj_live_99/events',
  defaultPayload = JSON.stringify(
    {
      type: 'order.completed',
      idempotency_key: 'evt_user_1092837',
      tenant_id: 'tenant_acme_corp',
      payload: {
        order_id: 'ord_9841',
        amount_cents: 4999,
        currency: 'USD',
        customer: {
          id: 'cus_8819',
          email: 'alex@example.com',
        },
      },
    },
    null,
    2
  ),
  sampleResponse = {
    event_id: 'evt_01HZX87AB9823KJ',
    status: 'QUEUED',
    idempotency_key: 'evt_user_1092837',
    created_at: new Date().toISOString(),
    deliveries_scheduled: 3,
    destinations: [
      { id: 'dest_warehouse_01', status: 'SCHEDULED' },
      { id: 'dest_accounting_02', status: 'SCHEDULED' },
      { id: 'dest_crm_03', status: 'SCHEDULED' },
    ],
  },
}: ApiPlaygroundProps) {
  const [method, setMethod] = useState(defaultMethod);
  const [apiKey, setApiKey] = useState('zyvan_live_sec_99a8b7c6d5e4');
  const [payloadText, setPayloadText] = useState(defaultPayload);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const handleSend = () => {
    setIsLoading(true);
    setResponse(null);

    setTimeout(() => {
      setIsLoading(false);
      setStatusCode(202);
      setLatencyMs(Math.floor(Math.random() * 25) + 18); // 18-42ms
      setResponse({
        ...sampleResponse,
        received_at: new Date().toISOString(),
      });
    }, 450);
  };

  const handleReset = () => {
    setPayloadText(defaultPayload);
    setResponse(null);
    setStatusCode(null);
    setLatencyMs(null);
  };

  return (
    <div className="my-8 rounded-xl border border-white/[0.08] bg-[#0A0A0E] shadow-2xl overflow-hidden font-geist-mono font-mono text-[13px]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/[0.06] bg-zinc-950 px-4 py-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#00DC5A]/15 text-[#00DC5A]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm text-zinc-100">
            Interactive API Playground
          </span>
          <span className="rounded bg-[#00DC5A]/10 border border-[#00DC5A]/20 px-1.5 py-0.5 text-[10px] text-[#00DC5A] uppercase">
            Live Sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md bg-[#00DC5A] text-black font-bold px-3.5 py-1.2 text-xs hover:bg-[#00c751] transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-[#00DC5A]/20"
          >
            {isLoading ? (
              <span className="animate-spin text-xs">⟳</span>
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>Send Request</span>
          </button>
        </div>
      </div>

      {/* Endpoint and Auth bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border-b border-white/[0.06] bg-zinc-900/40">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
            Method & Endpoint
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300">
            <span className="text-[#00DC5A] font-bold">{method}</span>
            <span className="truncate text-zinc-300">{endpoint}</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
            Authorization (Bearer)
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-zinc-950 px-3 py-1.5 text-xs text-[#00DC5A] font-mono focus:border-[#00DC5A] focus:outline-none"
          />
        </div>
      </div>

      {/* Body & Response split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
        {/* Request Payload Editor */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Request JSON Body
            </span>
            <span className="text-[10px] text-zinc-500">application/json</span>
          </div>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={10}
            className="w-full resize-none rounded-lg border border-white/[0.08] bg-zinc-950/90 p-3 text-xs text-emerald-300 focus:border-[#00DC5A] focus:outline-none"
          />
        </div>

        {/* Response Viewer */}
        <div className="p-4 bg-zinc-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Response Preview
            </span>
            {statusCode && (
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#00DC5A]/10 border border-[#00DC5A]/20 px-1.5 py-0.5 text-[11px] text-[#00DC5A] font-bold">
                  {statusCode} Accepted
                </span>
                {latencyMs && (
                  <span className="text-[11px] text-zinc-400">
                    {latencyMs}ms
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="h-[200px] overflow-auto rounded-lg border border-white/[0.08] bg-zinc-950/90 p-3 text-xs text-zinc-300">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-zinc-400 animate-pulse">
                Sending event to Zyvan Ingestion Plane...
              </div>
            ) : response ? (
              <pre>{JSON.stringify(response, null, 2)}</pre>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500 text-center">
                <p>Click &quot;Send Request&quot; to test this endpoint live.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
