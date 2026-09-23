import React from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import { CodeBlock } from '@/components/mdx/CodeGroup';
import { ArchitectureDiagram } from '@/components/mdx/ArchitectureDiagram';

export default function DocsLandingPage() {
  return (
    <div className="min-w-0 max-w-4xl flex-1 px-4 sm:px-8 py-10 font-mono">
      {/* Hero Section */}
      <section className="mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 px-3 py-1 text-xs text-[#22C55E] mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] motion-safe:animate-pulse" />
          <span>Zyvan Developer Documentation</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
          Reliable webhook infrastructure for production systems.
        </h1>
        <p className="text-base text-zinc-400 max-w-2xl leading-relaxed mb-8">
          Send webhook events with guaranteed at-least-once delivery, automatic exponential backoff, dead-letter queue triaging, and zero-dependency SDK verification.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/getting-started/quickstart"
            className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 text-xs font-semibold text-black hover:bg-[#16A34A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/api-reference/events"
            className="flex items-center gap-2 rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <span>API Reference</span>
          </Link>
          <Link
            href="/sdks/typescript-node"
            className="flex items-center gap-2 rounded-lg border border-[#1B241F] bg-[#0B0D0C] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Node.js SDK</span>
          </Link>
        </div>
      </section>

      {/* Terminal Quick Installation */}
      <section className="mb-12">
        <h2 className="text-xs uppercase font-semibold text-zinc-500 tracking-wider mb-2">
          Install the Official SDK
        </h2>
        <CodeBlock code="pnpm add @zyvan/sdk" language="bash" />
      </section>

      {/* Architecture Flow */}
      <section className="mb-12">
        <ArchitectureDiagram />
      </section>

      {/* Category Navigation Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/getting-started/quickstart"
          className="rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
            <Zap className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
              Quickstart Guide
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ingest your first webhook event and receive outbound deliveries in under 5 minutes.
          </p>
        </Link>

        <Link
          href="/sdks/typescript-node"
          className="rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
            <Terminal className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
              TypeScript / Node.js SDK
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Typed client resources, automatic retries with jitter, and zero-dependency verification.
          </p>
        </Link>

        <Link
          href="/guides/verify-webhook-signatures"
          className="rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
              Webhook Verification
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Timing-safe HMAC-SHA256 signature verification recipes across Next.js, Express, Fastify, Python, and Go.
          </p>
        </Link>

        <Link
          href="/api-reference/events"
          className="rounded-lg border border-[#1B241F] bg-[#0B0D0C] p-5 hover:border-[#22C55E]/40 hover:bg-[#101412] transition-colors group"
        >
          <div className="flex items-center gap-2 mb-2 text-[#22C55E]">
            <RefreshCw className="w-4 h-4" />
            <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-[#22C55E] transition-colors">
              REST API Reference
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Complete endpoints specification for events, destinations, deliveries, and dead-letter queue.
          </p>
        </Link>
      </section>
    </div>
  );
}
