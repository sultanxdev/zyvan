'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Zap,
} from 'lucide-react';

interface PresetEndpoint {
  id: string;
  label: string;
  method: 'GET' | 'POST';
  path: string;
  defaultHeaders: Record<string, string>;
  defaultBody?: string;
  description: string;
}

const PRESET_ENDPOINTS: PresetEndpoint[] = [
  {
    id: 'send_event',
    label: 'Send Event',
    method: 'POST',
    path: '/v1/events',
    description: 'Ingest an event with atomic database deduplication',
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
    defaultBody: JSON.stringify(
      {
        type: 'order.completed',
        tenant_id: 'cust_acme_corp',
        data: {
          order_id: 'ord_998124',
          amount: 14900,
          currency: 'USD',
          customer_email: 'buyer@example.com',
        },
      },
      null,
      2
    ),
  },
  {
    id: 'list_events',
    label: 'List Events',
    method: 'GET',
    path: '/v1/events?limit=10',
    description: 'Query historical events with pagination',
    defaultHeaders: {},
  },
  {
    id: 'list_destinations',
    label: 'List Destinations',
    method: 'GET',
    path: '/v1/destinations',
    description: 'List registered webhook endpoints',
    defaultHeaders: {},
  },
  {
    id: 'dlq_summary',
    label: 'DLQ Summary',
    method: 'GET',
    path: '/v1/dead-letters/summary',
    description: 'Retrieve aggregated triage metrics on failed deliveries',
    defaultHeaders: {},
  },
];

export function ApiPlayground() {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('send_event');
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('tx_ord_998124_stripe');
  const [bodyText, setBodyText] = useState<string>(
    PRESET_ENDPOINTS[0].defaultBody || ''
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseStatusText, setResponseStatusText] = useState<string>('');
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isBackendOffline, setIsBackendOffline] = useState<boolean>(false);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);

  const activePreset = PRESET_ENDPOINTS.find((p) => p.id === selectedEndpointId)!;

  const handleSelectPreset = (presetId: string) => {
    setSelectedEndpointId(presetId);
    const preset = PRESET_ENDPOINTS.find((p) => p.id === presetId)!;
    setBodyText(preset.defaultBody || '');
    setResponseBody(null);
    setResponseStatus(null);
    setIsBackendOffline(false);
  };

  const generateUuid = () => {
    const key = `tx_evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setIdempotencyKey(key);
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseBody(null);
    setIsBackendOffline(false);
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      if (activePreset.method === 'POST' && idempotencyKey.trim()) {
        headers['Idempotency-Key'] = idempotencyKey.trim();
      }

      // Route through secure docs server proxy
      const proxyUrl = `/api/proxy${activePreset.path}`;

      const res = await fetch(proxyUrl, {
        method: activePreset.method,
        headers,
        body: activePreset.method === 'POST' ? bodyText : undefined,
      });

      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);
      setResponseStatus(res.status);
      setResponseStatusText(res.statusText);

      const data = await res.text();
      let formatted = data;
      try {
        const json = JSON.parse(data);
        formatted = JSON.stringify(json, null, 2);

        // Check if proxy returned genuine offline error
        if (res.status === 503 && json?.error?.code === 'BACKEND_UNAVAILABLE') {
          setIsBackendOffline(true);
        }
      } catch {
        // Raw text response
      }

      setResponseBody(formatted);
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);
      setResponseStatus(503);
      setResponseStatusText('Service Unavailable');
      setIsBackendOffline(true);
      setResponseBody(
        JSON.stringify(
          {
            error: {
              code: 'CONNECTION_FAILED',
              message: 'Failed to connect to the documentation proxy.',
              details: err instanceof Error ? err.message : String(err),
            },
          },
          null,
          2
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = async () => {
    if (responseBody) {
      await navigator.clipboard.writeText(responseBody);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  return (
    <div className="my-8 rounded-xl border border-[#1B241F] bg-[#070908] p-5 font-mono shadow-2xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#141A17] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-4 h-4 text-[#22C55E]" />
            <h3 className="font-bold text-sm text-zinc-100">
              Interactive Events Playground
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400">
            Execute real API requests via the secured Zyvan documentation proxy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-0.5 text-[10px] text-[#22C55E] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] motion-safe:animate-pulse" />
            Live Execution
          </span>
        </div>
      </div>

      {/* Preset Selector */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 block">
          Select Target Endpoint
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_ENDPOINTS.map((preset) => {
            const isSelected = preset.id === selectedEndpointId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-[#22C55E] bg-[#101412] shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                    : 'border-[#1B241F] bg-[#0B0D0C] hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      preset.method === 'POST'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                        : 'bg-blue-950 text-blue-400 border border-blue-800/40'
                    }`}
                  >
                    {preset.method}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-zinc-100' : 'text-zinc-300'
                    }`}
                  >
                    {preset.label}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 truncate w-full">
                  {preset.path}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Authentication & Idempotency Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Ephemeral API Key */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#22C55E]" />
              API Key
            </label>
            <span className="text-[10px] text-zinc-500 italic">
              Ephemeral (In-RAM only)
            </span>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="zyv_live_... or zyv_test_..."
              className="w-full rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-3 py-2 pr-9 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-[#22C55E] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Idempotency Key (Only for POST) */}
        {activePreset.method === 'POST' ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-zinc-300">
                Idempotency-Key
              </label>
              <button
                type="button"
                onClick={generateUuid}
                className="text-[10px] text-[#22C55E] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Regenerate
              </button>
            </div>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-[#22C55E] focus:outline-none"
            />
          </div>
        ) : (
          <div className="flex flex-col justify-end">
            <div className="p-2.5 rounded-lg border border-[#1B241F] bg-[#0B0D0C] text-[11px] text-zinc-400">
              Safe idempotent read request: no mutate operations will occur.
            </div>
          </div>
        )}
      </div>

      {/* Request Body (for POST) */}
      {activePreset.method === 'POST' && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-300 mb-1.5 block">
            JSON Request Body
          </label>
          <textarea
            rows={7}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="w-full rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-3 text-xs text-zinc-200 font-mono focus:border-[#22C55E] focus:outline-none leading-relaxed selection:bg-[#22C55E]/30"
          />
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#141A17]">
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-bold text-zinc-200">{activePreset.method}</span>
          <span className="text-[#22C55E]">{activePreset.path}</span>
        </div>

        <button
          type="button"
          onClick={handleSendRequest}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 text-xs font-bold text-black hover:bg-[#16A34A] transition-all disabled:opacity-50 shadow-[0_0_12px_rgba(34,197,94,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Send Request</span>
            </>
          )}
        </button>
      </div>

      {/* Response Panel */}
      {responseStatus !== null && (
        <div className="mt-4 rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#141A17] pb-2.5">
            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                  responseStatus >= 200 && responseStatus < 300
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                    : responseStatus === 401 || responseStatus === 403
                    ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                    : 'bg-red-950 text-red-400 border border-red-800/40'
                }`}
              >
                <span>
                  {responseStatus >= 200 && responseStatus < 300 ? '✓' : '!'}
                </span>
                <span>
                  {responseStatus} {responseStatusText}
                </span>
              </span>

              {latencyMs !== null && (
                <span className="text-[11px] text-zinc-500">
                  {latencyMs}ms
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={copyResponse}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white bg-[#101412] border border-[#1B241F] px-2 py-1 rounded"
              aria-label="Copy response body"
            >
              {copiedResponse ? (
                <>
                  <Check className="w-3 h-3 text-[#22C55E]" />
                  <span className="text-[#22C55E]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Genuine Backend Offline Alert Banner */}
          {isBackendOffline && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-200">
                  Backend API Offline or Unreachable
                </strong>
                <span>
                  The documentation proxy could not connect to the Zyvan API gateway at port 4000. Start the local server with <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">pnpm --filter @zyvan/api dev</code> or configure <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">DOCS_API_BASE_URL</code>.
                </span>
              </div>
            </div>
          )}

          {/* Response Body Pre */}
          <div className="overflow-x-auto text-xs text-zinc-200 bg-[#070908] p-3 rounded border border-[#141A17]">
            <pre>
              <code>{responseBody}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
