'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Terminal,
  ShieldCheck,
  RotateCcw,
  Code2,
  Cpu,
  Layers,
  Zap,
  ArrowRight,
  Database,
  Radio,
  Server,
  Lock,
} from 'lucide-react';

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

interface CodeSnippet {
  id: string;
  label: string;
  icon: React.ReactNode;
  language: string;
  filename: string;
  code: string;
  description: string;
}

const CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'publish',
    label: 'Publish Event',
    icon: <Zap className="w-3.5 h-3.5" />,
    language: 'typescript',
    filename: 'publish-event.ts',
    description: 'Dispatch an event with guaranteed idempotency and multi-tenant scoping.',
    code: `import { ZyvanClient } from '@zyvan/sdk';

const zyvan = new ZyvanClient({
  apiKey: process.env.ZYVAN_API_KEY!,
  projectId: 'prj_live_01H8X92M4Q',
});

// Idempotent event publication (sub-50ms ingestion)
const event = await zyvan.events.create({
  eventType: 'payment.succeeded',
  tenantId: 'cust_acme_corp',
  idempotencyKey: 'tx_ord_998124_stripe',
  payload: {
    orderId: 'ord_998124',
    amount: 14900,
    currency: 'USD',
    customerEmail: 'billing@acme.com',
  },
});

console.log(\`Event queued: \${event.id} (Status: \${event.status})\`);
// Output: Event queued: evt_01J20M92... (Status: QUEUED)`,
  },
  {
    id: 'verify',
    label: 'Verify Webhook',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    language: 'typescript',
    filename: 'verify-signature.ts',
    description: 'Zero-dependency HMAC-SHA256 signature verification with timing-safe comparison.',
    code: `import { WebhookReceiver } from '@zyvan/sdk/webhooks';

const receiver = new WebhookReceiver({
  secret: process.env.ZYVAN_WEBHOOK_SECRET!,
  toleranceSeconds: 300, // Reject requests older than 5 minutes
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-zyvan-signature');
  const timestamp = request.headers.get('x-zyvan-timestamp');

  try {
    // Constant-time signature verification prevents timing attacks
    const event = receiver.verify({
      rawBody,
      signature: signature || '',
      timestamp: timestamp || '',
    });

    console.log(\`Verified event: \${event.type} for \${event.tenant_id}\`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response('Invalid webhook signature', { status: 401 });
  }
}`,
  },
  {
    id: 'replay',
    label: 'Replay Dead-Letter Queue',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    language: 'typescript',
    filename: 'replay-dlq.ts',
    description: 'Atomically replay failed deliveries after fixing downstream endpoint issues.',
    code: `import { ZyvanClient } from '@zyvan/sdk';

const zyvan = new ZyvanClient({
  apiKey: process.env.ZYVAN_API_KEY!,
  projectId: 'prj_live_01H8X92M4Q',
});

// Replay all failed deliveries for a specific endpoint
const result = await zyvan.dlq.replay({
  destinationId: 'dst_analytics_hook',
  failedAfter: new Date(Date.now() - 3600 * 1000).toISOString(),
  limit: 100,
});

console.log(\`Replayed \${result.replayedCount} deliveries back to active queue.\`);`,
  },
  {
    id: 'curl',
    label: 'Direct HTTP (cURL)',
    icon: <Code2 className="w-3.5 h-3.5" />,
    language: 'bash',
    filename: 'request.sh',
    description: 'Standard REST API request without SDK dependencies.',
    code: `curl -X POST https://api.zyvan.dev/v1/projects/prj_live_01H8X92M4Q/events \\
  -H "Authorization: Bearer zyv_live_99f2e718b..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: evt_ord_998124_stripe" \\
  -d '{
    "event_type": "invoice.generated",
    "tenant_id": "cust_acme_corp",
    "payload": {
      "invoice_id": "inv_10284",
      "total": 4900,
      "status": "finalized"
    }
  }'`,
  },
];

const PIPELINE_STEPS = [
  {
    step: 1,
    title: 'Durable Ingestion',
    badge: 'Sub-50ms',
    icon: <Database className="w-4 h-4 text-[#22C55E]" />,
    detail: 'HTTP request validated, idempotency key verified via unique PostgreSQL index, payload persisted to transactional outbox.',
    metric: '< 25ms P95',
  },
  {
    step: 2,
    title: 'Tenant Router',
    badge: 'Fair Share',
    icon: <Layers className="w-4 h-4 text-emerald-400" />,
    detail: 'Event fan-out matches active destinations. Per-tenant token bucket rate limits and concurrency semaphores prevent noisy neighbors.',
    metric: '10k+ req/sec',
  },
  {
    step: 3,
    title: 'Dispatch & Signing',
    badge: 'HMAC-SHA256',
    icon: <Lock className="w-4 h-4 text-green-300" />,
    detail: 'Signing secret decrypted via AES-256-GCM. RFC-compliant timestamp and HMAC header signed before SSRF-safe HTTP POST with DNS pinning.',
    metric: '10s Timeout',
  },
  {
    step: 4,
    title: 'Adaptive Retries & DLQ',
    badge: 'TTL + DLX',
    icon: <Radio className="w-4 h-4 text-amber-400" />,
    detail: '2xx transitions to DELIVERED. 429/5xx routed to RabbitMQ delayed queues with full jitter. Exhausted retries safely archived to DLQ for 1-click replay.',
    metric: 'Zero Polling',
  },
];

export function LandingInteractive() {
  const [selectedPm, setSelectedPm] = useState<PackageManager>('pnpm');
  const [activeSnippetId, setActiveSnippetId] = useState<string>('publish');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  const installCommands: Record<PackageManager, string> = {
    pnpm: 'pnpm add @zyvan/sdk',
    npm: 'npm install @zyvan/sdk',
    yarn: 'yarn add @zyvan/sdk',
    bun: 'bun add @zyvan/sdk',
  };

  const activeSnippet = CODE_SNIPPETS.find((s) => s.id === activeSnippetId)!;

  const copyInstall = async () => {
    await navigator.clipboard.writeText(installCommands[selectedPm]);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const copySnippet = async () => {
    await navigator.clipboard.writeText(activeSnippet.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-12">
      {/* Quick Install Bar */}
      <div className="rounded-xl border border-[#1B241F] bg-[#070908] p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#22C55E]" />
              Official SDK
            </span>
            <span className="rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 text-[10px] text-[#22C55E] font-medium">
              v1.0.0
            </span>
          </div>

          {/* Package Manager Selector */}
          <div className="flex items-center bg-[#0B0D0C] p-1 rounded-lg border border-[#1B241F]">
            {(['pnpm', 'npm', 'yarn', 'bun'] as PackageManager[]).map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => setSelectedPm(pm)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  selectedPm === pm
                    ? 'bg-[#22C55E] text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {pm}
              </button>
            ))}
          </div>
        </div>

        {/* Command Line Preview */}
        <div className="mt-3 flex items-center justify-between gap-3 bg-[#0B0D0C] rounded-lg border border-[#1B241F] px-4 py-2.5">
          <div className="flex items-center gap-3 overflow-x-auto text-xs font-mono text-zinc-200">
            <span className="text-[#22C55E] font-bold select-none">$</span>
            <code>{installCommands[selectedPm]}</code>
          </div>
          <button
            type="button"
            onClick={copyInstall}
            className="flex items-center gap-1.5 shrink-0 text-xs text-zinc-400 hover:text-white bg-[#101412] hover:bg-[#1B241F] border border-[#1B241F] rounded px-2.5 py-1 transition-colors"
            aria-label="Copy install command"
          >
            {copiedInstall ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-[#22C55E] text-[11px] font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Code Playground Showcase */}
      <div className="rounded-xl border border-[#1B241F] bg-[#070908] overflow-hidden shadow-2xl">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#1B241F] bg-[#0B0D0C]/80 px-3 py-2">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {CODE_SNIPPETS.map((snippet) => {
              const isActive = snippet.id === activeSnippetId;
              return (
                <button
                  key={snippet.id}
                  type="button"
                  onClick={() => setActiveSnippetId(snippet.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#101412] text-[#22C55E] border border-[#22C55E]/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  {snippet.icon}
                  <span>{snippet.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] text-zinc-500 font-mono">
              {activeSnippet.filename}
            </span>
            <button
              type="button"
              onClick={copySnippet}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-[#101412] hover:bg-[#1B241F] border border-[#1B241F] rounded-lg px-2.5 py-1 transition-colors"
              aria-label="Copy code snippet"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="text-[#22C55E] text-[11px] font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Snippet Context Bar */}
        <div className="bg-[#0B0D0C] border-b border-[#141A17] px-4 py-2 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>{activeSnippet.description}</span>
          <span className="text-[#22C55E] font-medium hidden md:inline">● Type-safe Node.js & Edge</span>
        </div>

        {/* Code Content Area */}
        <div className="p-4 sm:p-5 overflow-x-auto font-mono text-xs leading-relaxed text-zinc-200 bg-[#070908]">
          <pre className="selection:bg-[#22C55E]/30">
            <code>{activeSnippet.code}</code>
          </pre>
        </div>
      </div>

      {/* Interactive Lifecycle Pipeline */}
      <div className="rounded-xl border border-[#1B241F] bg-[#070908] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6 border-b border-[#1B241F] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-[#22C55E] motion-safe:animate-pulse" />
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Event Execution Pipeline
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              Interactive 4-stage lifecycle of every webhook dispatched through Zyvan.
            </p>
          </div>
          <span className="hidden sm:inline text-xs text-zinc-500 font-medium">
            PostgreSQL + RabbitMQ DLX
          </span>
        </div>

        {/* Interactive Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((s) => {
            const isSelected = activeStep === s.step;
            return (
              <div
                key={s.step}
                onClick={() => setActiveStep(s.step)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-[#22C55E] bg-[#101412] shadow-[0_0_15px_rgba(34,197,94,0.12)]'
                    : 'border-[#1B241F] bg-[#0B0D0C] hover:border-[#22C55E]/40 hover:bg-[#0E1210]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B241F] text-[10px] font-bold text-zinc-300">
                      {s.step}
                    </span>
                    <span className="text-[10px] font-semibold text-[#22C55E] uppercase tracking-wider">
                      {s.badge}
                    </span>
                  </div>
                  {s.icon}
                </div>
                <h4 className="text-xs font-bold text-zinc-100 mb-1.5">{s.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{s.detail}</p>
                <div className="flex items-center justify-between pt-2 border-t border-[#1B241F] text-[10px]">
                  <span className="text-zinc-500">Latency / Bound:</span>
                  <span className="text-[#22C55E] font-semibold">{s.metric}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
