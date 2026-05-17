"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDown,
  Clock,
  Database,
  Eye,
  GitBranch,
  Layers,
  Radio,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";

const TERMINAL_LINES = [
  "$ curl -X POST https://ingest.zyvan.dev/v1/events \\",
  "  -H 'Authorization: Bearer zv_sk_prod_••••••••' \\",
  "  -d '{\"event\":\"payment.succeeded\"}'",
  "",
  "HTTP/2 202 Accepted",
  '{ "status": "queued" }',
];

const FEATURES = [
  {
    icon: <Database className="w-5 h-5" />,
    title: "Durable Event Storage",
    description:
      "Events are persisted before delivery attempts, ensuring crash-safe and replay-safe processing.",
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    title: "Retry Orchestration",
    description:
      "Exponential backoff with jitter for resilient webhook delivery during downstream outages.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Dead Letter Queue",
    description:
      "Failed deliveries are isolated with complete attempt history and replay support.",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Event Observability",
    description:
      "Structured logs, delivery traces, latency metrics, and delivery attempt visibility.",
  },
];

const FLOW = [
  "Client API",
  "PostgreSQL",
  "Redis",
  "BullMQ Workers",
  "Outgoing Proxy",
  "Webhook Endpoint",
];

function GridBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none opacity-40"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }}
    />
  );
}

function AnimatedTerminal() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible((prev) => {
        if (prev >= TERMINAL_LINES.length) return 0;
        return prev + 1;
      });
    }, 700);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-emerald-500" />

        <span className="ml-2 text-xs text-zinc-500 font-mono">
          ingest.zyvan.dev
        </span>
      </div>

      <div className="p-5 min-h-[220px] font-mono text-xs text-zinc-300 space-y-2">
        {TERMINAL_LINES.slice(0, visible).map((line, i) => (
          <div key={i}>{line || "\u00A0"}</div>
        ))}

        {visible < TERMINAL_LINES.length && (
          <div className="w-2 h-4 bg-zinc-300 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function FlowDiagram() {
  return (
    <div className="flex flex-col items-center gap-3">
      {FLOW.map((item, index) => (
        <div key={item} className="flex flex-col items-center">
          <div className="w-64 border border-zinc-800 bg-zinc-900 rounded-xl px-5 py-4 text-center">
            <p className="font-mono text-sm text-zinc-100">{item}</p>
          </div>

          {index < FLOW.length - 1 && (
            <ArrowDown className="w-4 h-4 text-zinc-600 my-2" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <GridBackground />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span className="font-mono font-semibold">zyvan</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-500">
            <a
              href="#architecture"
              className="hover:text-zinc-100 transition-colors"
            >
              Architecture
            </a>

            <a
              href="#features"
              className="hover:text-zinc-100 transition-colors"
            >
              Features
            </a>

            <a
              href="https://github.com"
              className="hover:text-zinc-100 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative max-w-6xl mx-auto px-6 pt-28 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-900 rounded-full px-3 py-1.5 text-xs font-mono text-sky-400 mb-8">
              <Activity className="w-3 h-3" />
              Open-source infrastructure software
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Distributed Webhook
              <span className="block text-sky-400">
                Reliability Infrastructure
              </span>
            </h1>

            <p className="text-lg text-zinc-400 leading-relaxed max-w-xl mb-8">
              Zyvan provides durable event ingestion, retry orchestration,
              dead-letter recovery, and observability for modern backend
              systems.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#architecture"
                className="px-5 py-2.5 rounded-lg bg-zinc-100 text-zinc-950 text-sm font-medium hover:bg-white transition-colors"
              >
                View Architecture
              </a>

              <a
                href="https://github.com"
                className="px-5 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors flex items-center gap-2"
              >
                <GitBranch className="w-4 h-4" />
                GitHub
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                ["Delivery", "At-least-once"],
                ["Queue", "BullMQ"],
                ["Storage", "PostgreSQL"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40"
                >
                  <p className="text-xs text-zinc-500 font-mono mb-1">
                    {label}
                  </p>

                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <AnimatedTerminal />
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section
        id="architecture"
        className="border-t border-zinc-800 py-24"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-mono text-sky-400 mb-2">
              // architecture
            </p>

            <h2 className="text-3xl font-bold mb-4">
              Event Delivery Pipeline
            </h2>

            <p className="text-zinc-500 max-w-2xl leading-relaxed">
              Events move through a durable asynchronous pipeline designed for
              reliability, recoverability, and operational visibility.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <FlowDiagram />

            <div className="space-y-5">
              {[
                {
                  icon: <Zap className="w-4 h-4 text-amber-400" />,
                  title: "Idempotency",
                  desc: "Duplicate requests are prevented before queue insertion.",
                },
                {
                  icon: <RefreshCw className="w-4 h-4 text-sky-400" />,
                  title: "Retry Engine",
                  desc: "Exponential backoff with jitter for transient delivery failures.",
                },
                {
                  icon: <Layers className="w-4 h-4 text-violet-400" />,
                  title: "Dead Letter Recovery",
                  desc: "Failed events are isolated with replay support and attempt history.",
                },
                {
                  icon: <Shield className="w-4 h-4 text-emerald-400" />,
                  title: "HMAC Signing",
                  desc: "Outbound payload verification using HMAC-SHA256 signatures.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div>{item.icon}</div>

                    <div>
                      <h3 className="font-semibold mb-2">{item.title}</h3>

                      <p className="text-sm text-zinc-500 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="border-t border-zinc-800 py-24 bg-zinc-900/20"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <p className="text-xs font-mono text-violet-400 mb-2">
              // core features
            </p>

            <h2 className="text-3xl font-bold mb-4">
              Infrastructure Capabilities
            </h2>

            <p className="text-zinc-500 max-w-2xl leading-relaxed">
              Designed around operational reliability and asynchronous event
              processing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-5 text-zinc-300">
                  {feature.icon}
                </div>

                <h3 className="text-lg font-semibold mb-3">
                  {feature.title}
                </h3>

                <p className="text-sm text-zinc-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UNDER DEVELOPMENT */}
      <section className="border-t border-zinc-800 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 border border-amber-900/40 bg-amber-950/20 px-3 py-1.5 rounded-full text-xs font-mono text-amber-400 mb-6">
            <Clock className="w-3 h-3" />
            Active Development
          </div>

          <h2 className="text-3xl font-bold tracking-tight mb-5">
            Currently under active development
          </h2>

          <p className="text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            Core systems including durable ingestion, retry orchestration,
            queue workers, and dead-letter recovery are operational.
            Additional observability tooling and dashboard capabilities are in
            progress.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span className="font-mono font-semibold">zyvan</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-zinc-500">
            <a href="https://github.com" className="hover:text-zinc-100">
              GitHub
            </a>

            <a href="#architecture" className="hover:text-zinc-100">
              Architecture
            </a>

            <a href="#features" className="hover:text-zinc-100">
              Features
            </a>
          </div>

          <p className="text-xs text-zinc-700 font-mono">
            PostgreSQL · Redis · BullMQ · Next.js
          </p>
        </div>
      </footer>
    </main>
  );
}