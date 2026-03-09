'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Zap, ShieldCheck, Activity, TerminalSquare, Github, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight">Zyvan</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="https://github.com/sultanxdev/zyvan" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
              <Github size={16} /> GitHub
            </Link>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              Documentation
            </Link>
            <Link
              href="/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all border border-white/10 flex items-center gap-2"
            >
              Open Dashboard <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300 mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Zyvan 1.0 is now live in production
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="text-6xl md:text-8xl font-extrabold tracking-tighter max-w-4xl leading-[1.1] mb-8"
        >
          Webhook reliability,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            perfectly executed.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="text-xl md:text-2xl text-gray-400 max-w-2xl font-light mb-12"
        >
          Zyvan is the open-source distributed middleware that acts as a shock absorber for your API. Never drop an event again.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center justify-center gap-2 bg-white text-black font-semibold text-lg px-8 py-4 rounded-2xl overflow-hidden transition-transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            Start building
            <kbd className="hidden sm:inline-flex items-center gap-1 font-sans text-xs bg-black/10 px-2 py-1 rounded-md text-black/60 ml-2">
              ⌘ K
            </kbd>
          </Link>

          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 font-mono text-sm text-gray-300">
            <span className="text-indigo-400">$</span> docker compose up -d
            <button className="text-gray-500 hover:text-white transition-colors ml-4" onClick={() => navigator.clipboard.writeText('docker compose up -d')}>
              <TerminalSquare size={16} />
            </button>
          </div>
        </motion.div>

        {/* Raycast-style UI Mockup Component */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 w-full max-w-5xl rounded-[32px] p-2 bg-gradient-to-b from-white/10 to-transparent shadow-2xl shadow-indigo-500/10"
        >
          <div className="rounded-[28px] overflow-hidden bg-black border border-white/10 flex flex-col">
            {/* Window frame */}
            <div className="h-12 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="mx-auto px-4 py-1 rounded-md bg-white/5 border border-white/5 text-xs text-gray-400 font-mono flex items-center gap-2">
                <ShieldCheck size={12} className="text-green-400" />
                POST https://api.zyvan.io/v1/events
              </div>
            </div>

            {/* Editor Area */}
            <div className="p-8 pb-0 text-left relative overflow-hidden h-[400px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
              <pre className="font-mono text-sm leading-relaxed text-gray-300">
                <span className="text-purple-400">import</span> &#123; ZyvanClient &#125; <span className="text-purple-400">from</span> <span className="text-green-300">'@zyvan/sdk'</span>;
                <br /><br />
                <span className="text-gray-500">{'// Initialize the client'}</span>
                <br />
                <span className="text-purple-400">const</span> zyvan = <span className="text-purple-400">new</span> <span className="text-yellow-200">ZyvanClient</span>(&#123;
                <br />
                {'  '}apiKey: process.env.<span className="text-blue-300">ZYVAN_API_KEY</span>,
                <br />
                &#125;);
                <br /><br />
                <span className="text-gray-500">{'// Dispatch an event idempotently'}</span>
                <br />
                <span className="text-purple-400">await</span> zyvan.events.<span className="text-blue-300">dispatch</span>(&#123;
                <br />
                {'  '}endpoint_id: <span className="text-green-300">'ep_9a8b7c6d'</span>,
                <br />
                {'  '}event_type: <span className="text-green-300">'payment.succeeded'</span>,
                <br />
                {'  '}idempotencyKey: <span className="text-green-300">'idem_xyz_123'</span>,
                <br />
                {'  '}payload: &#123;
                <br />
                {'    '}amount: <span className="text-orange-300">4900</span>,
                <br />
                {'    '}currency: <span className="text-green-300">'USD'</span>,
                <br />
                {'  '}&#125;
                <br />
                &#125;);
                <br /><br />
                <span className="text-gray-500">{'// Zyvan takes it from here. It will automatically backoff and retry'}</span>
                <br />
                <span className="text-gray-500">{'// if the target server is down, then drop it in the DLQ if it fails permanently.'}</span>
              </pre>

              {/* Status overlay card floating over code */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute right-8 bottom-8 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-2xl w-64 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Delivery Status</span>
                  <Activity size={14} className="text-indigo-400" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Delivered</div>
                    <div className="text-xs text-gray-400">HTTP 200 OK • 120ms</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Grid */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">Engineering beyond the standard.</h2>
          <p className="text-gray-400 text-lg">Features built for mission-critical, enterprise-scale reliability.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            title="Idempotency Guarantees"
            description="Built-in atomic locking prevents duplicate deliveries even if your internal microservices blindly retry."
            icon={<ShieldCheck size={24} className="text-indigo-400" />}
          />
          <FeatureCard 
            title="Exponential Backoff"
            description="Automated BullMQ delayed job processing with intelligent jitter to prevent downstream server DDoSing."
            icon={<Activity size={24} className="text-purple-400" />}
          />
          <FeatureCard 
            title="Dead Letter Queues"
            description="Poison messages are isolated into a DLQ schema allowing your team to manually replay them from the dashboard."
            icon={<TerminalSquare size={24} className="text-blue-400" />}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 text-center text-sm text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
            <Zap size={16} /> Zyvan Reliability Engine
          </div>
          <p>Built with Next.js, BullMQ, Express, and PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:scale-110 group-hover:rotate-12">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
        <p className="text-gray-400 leading-relaxed text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}
