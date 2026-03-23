'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import {
  Zap, ShieldCheck, Activity, TerminalSquare, Github, ArrowRight,
  CheckCircle2, Globe, Lock, RefreshCw, Database, Clock, Menu, X,
  ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import LightPillar from '@/components/LightPillar';
import Footer from '@/components/Footer';

// ── Animated Counter ─────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-2xl transition-all duration-300 overflow-hidden ${open ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-transparent'}`}
    >
      <button
        className="w-full flex items-center justify-between gap-4 px-7 py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-base font-semibold text-white">{q}</span>
        <ChevronDown
          size={18}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`px-7 transition-all duration-300 ease-out ${open ? 'pb-6 max-h-96' : 'max-h-0 overflow-hidden'}`}>
        <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ── Feature Card ─────────────────────────────────────────────
function FeatureCard({ title, description, icon, gradient }: {
  title: string; description: string; icon: React.ReactNode; gradient: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative p-7 rounded-3xl bg-white/[0.03] border border-white/8 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300 overflow-hidden"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:border-white/20 transition-colors">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const faqs = [
    {
      q: 'Is Zyvan open source?',
      a: 'Yes, Zyvan is 100% open source under the MIT license. Clone it, self-host it via Docker Compose, modify it without restrictions. Zero vendor lock-in.'
    },
    {
      q: 'How does Zyvan prevent duplicate events?',
      a: 'Zyvan uses an atomic distributed idempotency key stored in Redis. When a service retries a webhook, Zyvan recognizes the idempotencyKey and safely drops the duplicate — even across multiple worker instances.'
    },
    {
      q: 'What happens when my destination goes offline?',
      a: 'Zyvan intercepts the failure and places the event into an exponential backoff queue via BullMQ. It progressively retries for up to 3 days with intelligent jitter. After exhausting retries, the event lands in the Dead Letter Queue for manual review and replay.'
    },
    {
      q: 'Can I self-host and still get cloud features later?',
      a: 'Absolutely. The self-hosted (MIT licensed) version has full feature parity with the upcoming cloud offering. You can migrate at any time — your data model is identical.'
    },
    {
      q: 'What tech stack does it use?',
      a: 'The backend runs Node.js + TypeScript with BullMQ for job processing and Prisma + PostgreSQL for persistence. Redis handles idempotency and job queuing. The frontend is Next.js 15 with real-time analytics.'
    },
  ];

  return (
    <div className="bg-black text-white min-h-[100dvh] font-sans selection:bg-lime-500/30 overflow-x-hidden">

      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-lime-500/8 blur-[160px] rounded-full pointer-events-none z-0" />
      <div className="fixed top-[60%] left-[10%] w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed top-[30%] right-[5%] w-[300px] h-[300px] bg-cyan-500/4 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Light Pillar */}
      <div className="absolute top-0 left-0 w-full h-[900px] pointer-events-none z-0 overflow-hidden">
        <LightPillar
          topColor="#4acf4c"
          bottomColor="#FF9FFC"
          intensity={1}
          rotationSpeed={0.3}
          glowAmount={0.002}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/8 shadow-2xl' : 'bg-transparent'}`}>
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(163,230,53,0.35)]">
              <Zap size={15} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[17px] tracking-tight text-white">Zyvan</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 text-sm">
            <a href="#features" className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">Features</a>
            <a href="#how-it-works" className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">How It Works</a>
            <a href="#pricing" className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">Pricing</a>
            <a href="#faq" className="px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="https://github.com/sultanxdev/zyvan" target="_blank" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
              <Github size={16} /> GitHub
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2 bg-lime-500 hover:bg-lime-400 text-black font-semibold text-sm px-4 py-2 rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(163,230,53,0.4)]">
              Open Dashboard <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex flex-col gap-2">
            <a href="#features" className="px-4 py-3 text-gray-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="px-4 py-3 text-gray-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="px-4 py-3 text-gray-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" className="px-4 py-3 text-gray-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link href="https://github.com/sultanxdev/zyvan" target="_blank" className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:text-white rounded-xl hover:bg-white/5">
                <Github size={16} /> GitHub
              </Link>
              <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-lime-500 text-black font-semibold px-4 py-3 rounded-xl">
                Open Dashboard <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main className="pt-36 md:pt-44 pb-16 md:pb-24 w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/25 text-sm font-medium text-lime-300 mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
          Zyvan 1.0 — Production Ready
          <ChevronRightIcon size={14} className="text-lime-400" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter max-w-5xl leading-[1.07] mb-6"
        >
          Webhook reliability,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-300 to-cyan-400">
            perfectly executed.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl font-light mb-10 leading-relaxed"
        >
          Zyvan is the open-source distributed middleware that acts as a shock absorber for your API. Automatic retries, dead letter queues, idempotency — zero dropped events.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-6"
        >
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-400 text-black font-bold text-base px-8 py-4 rounded-2xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(163,230,53,0.45)] w-full sm:w-auto"
          >
            Start Building Free
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/4 border border-white/10 font-mono text-sm text-gray-300 w-full sm:w-auto">
            <span className="text-lime-400">$</span>
            <span>docker compose up -d</span>
            <button
              className="text-gray-500 hover:text-white transition-colors ml-2"
              onClick={() => navigator.clipboard.writeText('docker compose up -d')}
              title="Copy"
            >
              <TerminalSquare size={15} />
            </button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-xs text-gray-600 flex items-center gap-2"
        >
          <Lock size={11} /> MIT Licensed · Self-hostable · No vendor lock-in
        </motion.p>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 w-full max-w-5xl"
        >
          <div className="relative rounded-[28px] p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-transparent">
            <div className="rounded-[27px] overflow-hidden bg-[#0a0a0a] border border-white/[0.06] flex flex-col shadow-2xl shadow-black/60">
              {/* Window Frame */}
              <div className="h-12 border-b border-white/8 bg-white/[0.03] flex items-center px-4 gap-3 flex-shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="mx-auto px-4 py-1 rounded-md bg-white/5 border border-white/[0.06] text-xs text-gray-400 font-mono flex items-center gap-2">
                  <ShieldCheck size={11} className="text-lime-400" />
                  POST https://api.zyvan.io/v1/events
                </div>
              </div>

              {/* Editor */}
              <div className="p-8 pb-0 text-left relative overflow-hidden h-[380px]">
                <div className="absolute top-0 right-0 w-56 h-56 bg-lime-500/8 blur-[80px] rounded-full pointer-events-none" />
                <pre className="font-mono text-[13px] leading-[1.75] text-gray-300">
                  <span className="text-lime-400">import</span>
                  {' { ZyvanClient } '}
                  <span className="text-lime-400">from</span>
                  {' '}
                  <span className="text-emerald-300">'@zyvan/sdk'</span>
                  {'\n\n'}
                  <span className="text-zinc-500">{'// Initialize the client'}</span>
                  {'\n'}
                  <span className="text-lime-400">const</span>
                  {' zyvan = '}
                  <span className="text-lime-400">new</span>
                  {' '}
                  <span className="text-white">ZyvanClient</span>
                  {'({\n  apiKey: process.env.'}
                  <span className="text-cyan-300">ZYVAN_API_KEY</span>
                  {',\n});\n\n'}
                  <span className="text-zinc-500">{'// Dispatch an event idempotently'}</span>
                  {'\n'}
                  <span className="text-lime-400">await</span>
                  {' zyvan.events.'}
                  <span className="text-cyan-300">dispatch</span>
                  {'({\n  endpoint_id: '}
                  <span className="text-emerald-300">'ep_9a8b7c6d'</span>
                  {',\n  event_type: '}
                  <span className="text-emerald-300">'payment.succeeded'</span>
                  {',\n  idempotencyKey: '}
                  <span className="text-emerald-300">'idem_xyz_123'</span>
                  {',\n  payload: { amount: '}
                  <span className="text-orange-300">4900</span>
                  {', currency: '}
                  <span className="text-emerald-300">'USD'</span>
                  {' },\n});\n\n'}
                  <span className="text-gray-600">{'// Zyvan handles retries, backoff & DLQ automatically.'}</span>
                </pre>

                {/* Status card overlay */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  className="absolute right-8 bottom-8 bg-black/60 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-2xl w-60 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">Delivery Status</span>
                    <Activity size={13} className="text-lime-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <ShieldCheck size={15} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Delivered</div>
                      <div className="text-xs text-gray-500">HTTP 200 · 118ms</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-600">Retries</span>
                    <span className="text-gray-400">0</span>
                  </div>
                  <div className="h-[1px] bg-white/5" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-600">Idempotency</span>
                    <span className="text-lime-400">✓ Protected</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Floating glow under mockup */}
          <div className="h-12 bg-lime-500/10 blur-2xl -mt-6 mx-20 rounded-full" />
        </motion.div>
      </main>

      {/* Social Proof / Stats */}
      <section className="relative z-10 border-y border-white/[0.04] bg-white/[0.01] py-16">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
          <p className="text-center text-xs uppercase tracking-widest text-gray-600 font-semibold mb-12">
            Built for reliability at scale
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { label: 'Events Processed', value: 12, suffix: 'M+' },
              { label: 'Uptime SLA', value: 99, suffix: '.99%' },
              { label: 'Avg Delivery Latency', value: 140, suffix: 'ms', prefix: '<' },
              { label: 'GitHub Stars', value: 2100, suffix: '+' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <div className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 md:py-36 w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <div className="mb-16 text-center">
          <p className="text-xs uppercase tracking-widest text-lime-500 font-semibold mb-4">Platform Features</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">Engineering beyond the standard.</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Every component is battle-tested and designed for mission-critical, enterprise-scale reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            title="Idempotency Guarantees"
            description="Built-in atomic Redis locking prevents duplicate deliveries — even when your internal services blindly retry on network blips."
            icon={<ShieldCheck size={22} className="text-lime-400" />}
            gradient="bg-gradient-to-br from-lime-500/8 to-transparent"
          />
          <FeatureCard
            title="Exponential Backoff"
            description="BullMQ-powered delayed job processing with intelligent jitter. Prevents thundering herd and downstream DDoS on retry storms."
            icon={<Activity size={22} className="text-emerald-400" />}
            gradient="bg-gradient-to-br from-emerald-500/8 to-transparent"
          />
          <FeatureCard
            title="Dead Letter Queues"
            description="Poison messages are isolated into a DLQ, letting your team inspect, fix root causes, and replay them from the dashboard with one click."
            icon={<TerminalSquare size={22} className="text-cyan-400" />}
            gradient="bg-gradient-to-br from-cyan-500/8 to-transparent"
          />
          <FeatureCard
            title="Real-time Analytics"
            description="7-day event volume charts, success rate tracking, status distributions — all visible in a beautiful dashboard updated every 30 seconds."
            icon={<Activity size={22} className="text-purple-400" />}
            gradient="bg-gradient-to-br from-purple-500/8 to-transparent"
          />
          <FeatureCard
            title="Multi-endpoint Routing"
            description="Register unlimited webhook endpoints with per-endpoint retry limits, timeouts, and signing secrets for HMAC verification."
            icon={<Globe size={22} className="text-blue-400" />}
            gradient="bg-gradient-to-br from-blue-500/8 to-transparent"
          />
          <FeatureCard
            title="API Key Management"
            description="Generate, rotate, and revoke API keys with full audit trails. Each key shows creation time and last-used timestamp."
            icon={<Lock size={22} className="text-orange-400" />}
            gradient="bg-gradient-to-br from-orange-500/8 to-transparent"
          />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-28 md:py-36 relative z-10 border-t border-white/[0.04]">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="mb-20 text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-lime-500 font-semibold mb-4">How It Works</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">Three steps to bulletproof webhooks.</h2>
            <p className="text-gray-400 text-lg">Production-ready in under 5 minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-14 left-[21%] right-[21%] h-[1px] bg-gradient-to-r from-lime-500/30 via-emerald-500/40 to-cyan-500/30" />

            {[
              {
                step: '01', title: 'Connect', color: 'lime',
                icon: <Globe size={24} className="text-lime-400" />,
                desc: 'Point your existing webhook sources at your Zyvan ingress endpoint. No SDK required — a simple URL redirect is all it takes.'
              },
              {
                step: '02', title: 'Process', color: 'emerald',
                icon: <Database size={24} className="text-emerald-400" />,
                desc: 'Zyvan queues, validates idempotency keys, rate-limits, and safely dispatches events to your downstream services.'
              },
              {
                step: '03', title: 'Monitor', color: 'cyan',
                icon: <Activity size={24} className="text-cyan-400" />,
                desc: 'Track every event lifecycle in real-time. Replay failures from the DLQ with a single click. Never be blind again.'
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.1 }}
                className="relative z-10 flex flex-col items-center text-center p-8 rounded-3xl bg-white/[0.02] border border-white/8 hover:border-white/15 transition-colors"
              >
                <div className={`w-20 h-20 rounded-full bg-black border border-white/12 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(163,230,53,0.08)]`}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border
                    ${item.color === 'lime' ? 'bg-lime-500/15 border-lime-500/30' : ''}
                    ${item.color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/30' : ''}
                    ${item.color === 'cyan' ? 'bg-cyan-500/15 border-cyan-500/30' : ''}
                  `}>
                    {item.icon}
                  </div>
                </div>
                <p className="text-xs font-mono text-gray-600 mb-2">{item.step}</p>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture / Tech Stack Strip */}
      <section className="py-16 relative z-10 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
          <p className="text-center text-xs uppercase tracking-widest text-gray-600 font-semibold mb-10">
            Powered by battle-tested infrastructure
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {['Node.js', 'TypeScript', 'BullMQ', 'Redis', 'PostgreSQL', 'Prisma', 'Next.js', 'Docker'].map((tech) => (
              <span key={tech} className="text-gray-500 hover:text-gray-300 transition-colors font-semibold text-sm tracking-wide cursor-default select-none">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28 md:py-36 relative z-10 border-t border-white/[0.04]">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="mb-20 text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-lime-500 font-semibold mb-4">Pricing</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">Transparent. Fair. Forever.</h2>
            <p className="text-gray-400 text-lg">Whether you self-host or need a managed cluster, we have a plan for you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Self-Hosted */}
            <div className="group p-8 rounded-[28px] bg-white/[0.03] border border-white/10 hover:border-white/18 flex flex-col transition-all duration-300">
              <div className="mb-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-2xl font-bold text-white">Self-Hosted</h3>
                  <span className="px-3 py-1 rounded-full bg-white/8 text-xs font-semibold text-gray-300 border border-white/10">MIT License</span>
                </div>
                <p className="text-gray-500 text-sm">Full control. Your infrastructure, your rules.</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white tracking-tight">$0</span>
                <span className="text-gray-500 text-lg font-medium"> / month</span>
              </div>
              <ul className="space-y-3.5 mb-8 flex-1 text-sm text-gray-300">
                {['Unlimited events & endpoints', 'Full observability dashboard', 'Automatic retries & DLQ', 'API key management', 'Community support', 'MIT licensed source code'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-lime-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="https://github.com/sultanxdev/zyvan"
                target="_blank"
                className="w-full py-3.5 rounded-xl bg-white/8 hover:bg-white/14 text-white font-semibold text-center transition-colors border border-white/10 hover:border-white/20 flex items-center justify-center gap-2"
              >
                <Github size={16} /> View on GitHub
              </Link>
            </div>

            {/* Cloud */}
            <div className="group relative p-8 rounded-[28px] bg-gradient-to-b from-lime-500/10 via-emerald-500/5 to-transparent border border-lime-500/25 flex flex-col overflow-hidden hover:border-lime-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-72 h-72 bg-lime-500/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute -top-1 -right-1 px-3 py-1 rounded-bl-xl rounded-tr-[27px] bg-lime-500 text-black text-xs font-bold">Coming Soon</div>
              <div className="mb-6 relative z-10">
                <h3 className="text-2xl font-bold text-white mb-3">Zyvan Cloud</h3>
                <p className="text-lime-200/50 text-sm">Fully managed cluster with enterprise SLAs and global routing.</p>
              </div>
              <div className="mb-8 relative z-10">
                <span className="text-5xl font-extrabold text-white tracking-tight">Custom</span>
                <span className="text-lime-200/50 text-lg font-medium"> / volume</span>
              </div>
              <ul className="space-y-3.5 mb-8 flex-1 text-sm text-gray-300 relative z-10">
                {['99.99% Guaranteed uptime SLA', 'Global multi-region routing', 'Dedicated ingress clusters', 'VPC peering & compliance', 'Premium support & onboarding', 'Custom volume pricing'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-lime-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="w-full py-3.5 rounded-xl bg-lime-500 text-black font-bold text-center cursor-not-allowed opacity-60 relative z-10"
              >
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-24 relative z-10">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="relative rounded-[32px] p-[1px] bg-gradient-to-r from-lime-500/30 via-emerald-500/20 to-cyan-500/20">
            <div className="relative rounded-[31px] overflow-hidden bg-gradient-to-b from-lime-950/40 to-black p-12 md:p-16 text-center">
              <div className="absolute inset-0 bg-lime-500/5" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-lime-500/20 blur-[60px] rounded-full" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
                  Never drop a webhook again.
                </h2>
                <p className="text-gray-400 mb-10 text-lg max-w-xl mx-auto">
                  Deploy in 2 minutes. Start with Docker Compose and scale to millions of events.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-400 text-black font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(163,230,53,0.4)]"
                  >
                    Open Dashboard <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="https://github.com/sultanxdev/zyvan"
                    target="_blank"
                    className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 text-white font-semibold px-8 py-4 rounded-2xl border border-white/15 transition-all"
                  >
                    <Github size={16} /> Star on GitHub
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <div className="mb-14 text-center">
          <p className="text-xs uppercase tracking-widest text-lime-500 font-semibold mb-4">FAQ</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">Frequently asked questions.</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
