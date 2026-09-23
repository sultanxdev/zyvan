import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Terminal,
  ShieldCheck,
  Zap,
  RefreshCw,
  Layers,
  Database,
  Lock,
  Radio,
  FileCode,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Compass,
} from 'lucide-react';
import { LandingInteractive } from '@/components/landing/LandingInteractive';
import { DOCS_LINKS } from '@/lib/constants';

export default function DocsLandingPage() {
  return (
    <div className="min-w-0 max-w-5xl flex-1 px-4 sm:px-8 py-10 font-mono space-y-16">
      {/* 1. Hero Section */}
      <section className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-1 text-xs text-[#22C55E] mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] motion-safe:animate-pulse" />
          <span className="font-semibold">Zyvan Developer Documentation</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-300">v1.0.0</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-none mb-6">
          Reliable webhook infrastructure{' '}
          <span className="text-[#22C55E]">for production systems.</span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed mb-8">
          Send webhook events with guaranteed at-least-once delivery, PostgreSQL-backed idempotency,
          RabbitMQ delayed retry queues with full jitter, tenant concurrency control, and zero-dependency
          HMAC-SHA256 SDK verification.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/getting-started/quickstart"
            className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#16A34A] transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            <span>Get Started in 5 Min</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/sdks/typescript-node"
            className="flex items-center gap-2 rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>TypeScript SDK</span>
          </Link>
          <Link
            href="/api-reference/events"
            className="flex items-center gap-2 rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <span>API Reference</span>
          </Link>
          <a
            href={DOCS_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:border-[#1B241F] hover:bg-[#101412] transition-colors"
          >
            <span>GitHub</span>
          </a>
        </div>
      </section>

      {/* 2. Key Architecture Metrics Invariants Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#1B241F] bg-[#070908] p-4 text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#22C55E]">99.99%</div>
          <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
            Delivery Guarantee
          </div>
        </div>
        <div className="rounded-lg border border-[#1B241F] bg-[#070908] p-4 text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-white">&lt; 50ms</div>
          <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
            P95 Ingestion Latency
          </div>
        </div>
        <div className="rounded-lg border border-[#1B241F] bg-[#070908] p-4 text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-[#22C55E]">0 Deps</div>
          <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
            SDK Verification
          </div>
        </div>
        <div className="rounded-lg border border-[#1B241F] bg-[#070908] p-4 text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-white">AES-256</div>
          <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
            GCM Secret Encryption
          </div>
        </div>
      </section>

      {/* 3. Interactive Code Showcase & Pipeline Execution */}
      <section>
        <LandingInteractive />
      </section>

      {/* 4. Core Technical Architecture Pillars */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Core Architectural Guarantees
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Engineered from first principles for mission-critical webhook delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Database className="w-5 h-5 text-[#22C55E]" />
              <span className="text-[10px] uppercase font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">
                Durable
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-2">Atomic Ingestion</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every incoming event is committed to PostgreSQL with a 24-hour unique idempotency key index. Zero dropped events during network blips or client retries.
            </p>
            <div className="mt-4 pt-3 border-t border-[#141A17]">
              <Link
                href="/core-concepts/idempotency-keys"
                className="text-[11px] text-[#22C55E] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Read Idempotency Spec</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Radio className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                Fair-Share
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-2">Tenant Concurrency Caps</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Granular per-tenant concurrency semaphores and token bucket rate limits protect receiver servers and eliminate the noisy neighbor problem.
            </p>
            <div className="mt-4 pt-3 border-t border-[#141A17]">
              <Link
                href="/core-concepts/projects-and-tenants"
                className="text-[11px] text-[#22C55E] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Multi-Tenant Architecture</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                TTL + DLX
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-2">RabbitMQ Delayed Retries</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Zero database polling overhead. Exponential backoff with full jitter scheduled dynamically via RabbitMQ message TTL and Dead-Letter Exchanges.
            </p>
            <div className="mt-4 pt-3 border-t border-[#141A17]">
              <Link
                href="/core-concepts/retries-and-backoff"
                className="text-[11px] text-[#22C55E] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Retry Engine & Jitter</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Lock className="w-5 h-5 text-green-300" />
              <span className="text-[10px] uppercase font-bold text-green-300 bg-green-300/10 px-2 py-0.5 rounded">
                Security
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-2">HMAC-SHA256 Signatures</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cryptographically signed headers with timestamp replay defense. Signing secrets are encrypted at rest with AES-256-GCM envelope encryption.
            </p>
            <div className="mt-4 pt-3 border-t border-[#141A17]">
              <Link
                href="/guides/verify-webhook-signatures"
                className="text-[11px] text-[#22C55E] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Verification Recipes</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 5 */}
          <div className="rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Zap className="w-5 h-5 text-red-400" />
              <span className="text-[10px] uppercase font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                Triaging
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-2">Dead-Letter Queue & Replay</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Exhausted deliveries are preserved with full HTTP attempt history. Inspect status codes, latency, and response bodies, then replay safely.
            </p>
            <div className="mt-4 pt-3 border-t border-[#141A17]">
              <Link
                href="/core-concepts/dead-letter-queue"
                className="text-[11px] text-[#22C55E] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>DLQ Mechanics</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 6 */}
          <div className="rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <Terminal className="w-5 h-5 text-[#22C55E]" />
              <span className="text-[10px] uppercase font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">
                Zero Drift
              </span>
            </div>
            <h3 className="text-sm font-bold text-zinc-100 mb-2">Official TypeScript SDK</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              First-class SDK with operation-safe retries, automatic exponential backoff, typed error hierarchies, and zero-dependency verification.
            </p>
            <div className="mt-4 pt-3 border-t border-[#141A17]">
              <Link
                href="/sdks/typescript-node"
                className="text-[11px] text-[#22C55E] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Explore TypeScript SDK</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. In-House Webhooks vs Zyvan Comparison Table */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            In-House Webhooks vs. Zyvan Engine
          </h2>
          <p className="text-xs text-zinc-400">
            Why engineering teams move from home-grown cron jobs to managed infrastructure.
          </p>
        </div>

        <div className="rounded-xl border border-[#1B241F] bg-[#070908] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0D0C] border-b border-[#1B241F] text-zinc-400 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Capability</th>
                  <th className="py-3 px-4 font-semibold text-zinc-500">Naive In-House Implementation</th>
                  <th className="py-3 px-4 font-semibold text-[#22C55E]">Zyvan Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141A17] text-zinc-300">
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Retry Scheduling</td>
                  <td className="py-3 px-4 text-zinc-400">
                    Database polling cron (`SELECT ... WHERE next_retry &lt; NOW()`), table lock contention
                  </td>
                  <td className="py-3 px-4 text-[#22C55E] font-medium">
                    RabbitMQ message TTL + DLX ($O(1)$ constant time, zero DB polling)
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Idempotency</td>
                  <td className="py-3 px-4 text-zinc-400">
                    Application-level cache checks with race condition vulnerabilities
                  </td>
                  <td className="py-3 px-4 text-[#22C55E] font-medium">
                    PostgreSQL atomic unique index `(project_id, idempotency_key)`
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Tenant Fair Share</td>
                  <td className="py-3 px-4 text-zinc-400">
                    Flat FIFO queue; one crashing customer starves all other deliveries
                  </td>
                  <td className="py-3 px-4 text-[#22C55E] font-medium">
                    Per-tenant token bucket rate limits &amp; concurrency semaphores
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Security &amp; SSRF</td>
                  <td className="py-3 px-4 text-zinc-400">
                    Unauthenticated HTTP `fetch()`, vulnerable to internal network port scanning
                  </td>
                  <td className="py-3 px-4 text-[#22C55E] font-medium">
                    DNS pinning, private IP blocklist, AES-256-GCM secret encryption
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">SDK &amp; Verification</td>
                  <td className="py-3 px-4 text-zinc-400">
                    Custom cryptographic code copy-pasted into receiver repos
                  </td>
                  <td className="py-3 px-4 text-[#22C55E] font-medium">
                    Zero-dependency timing-safe `WebhookReceiver` with timestamp replay checks
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Explore Documentation Sections */}
      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            Explore Documentation
          </h2>
          <p className="text-xs text-zinc-400">
            Jump directly into conceptual foundations, guides, SDK documentation, or API specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/getting-started/quickstart"
            className="group rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
              <Zap className="w-4 h-4" />
              <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
                Quickstart Guide
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Create a project, register your first destination, and deliver an event in under 5 minutes.
            </p>
          </Link>

          <Link
            href="/core-concepts/events-and-deliveries"
            className="group rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
              <Compass className="w-4 h-4" />
              <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
                Core Concepts
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Understand the 1-to-N event delivery model, idempotency keys, and tenant concurrency.
            </p>
          </Link>

          <Link
            href="/core-concepts/retries-and-backoff"
            className="group rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
              <RefreshCw className="w-4 h-4" />
              <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
                Webhooks &amp; Reliability
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Full jitter backoff math, RabbitMQ TTL + DLX queues, and dead-letter queue recovery.
            </p>
          </Link>

          <Link
            href="/sdks/typescript-node"
            className="group rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
              <Terminal className="w-4 h-4" />
              <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
                TypeScript / Node.js SDK
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Install and configure `@zyvan/sdk`. Includes typed client resources and error handlers.
            </p>
          </Link>

          <Link
            href="/guides/verify-webhook-signatures"
            className="group rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
              <ShieldCheck className="w-4 h-4" />
              <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
                Webhook Verification
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Recipes for Next.js App Router, Express, Fastify, Python, Go, and Ruby receivers.
            </p>
          </Link>

          <Link
            href="/api-reference/events"
            className="group rounded-xl border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
              <FileCode className="w-4 h-4" />
              <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
                REST API Reference
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Complete endpoints for events, destinations, deliveries, tenants, and DLQ replays.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
