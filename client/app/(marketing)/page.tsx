'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Zap, ShieldCheck, Activity, TerminalSquare, Github, ArrowRight, CheckCircle2 } from 'lucide-react';
import LightPillar from '@/components/LightPillar';
import Footer from '@/components/Footer';

export default function LandingPage() {
  return (
    <div className="bg-black text-white min-h-[100dvh] font-sans selection:bg-lime-500/30">
      {/* Dynamic Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-lime-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Light Pillar Background */}
      <div className="absolute top-0 left-0 w-full h-[800px] pointer-events-none z-0 overflow-hidden">
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-md backdrop-brightness-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(163,230,53,0.3)]">
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
              className="bg-white/5 hover:bg-white/10 backdrop-blur-md backdrop-brightness-50 text-white px-4 py-2 rounded-full transition-all border border-white/10 flex items-center gap-2"
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
          <span className="flex h-2 w-2 rounded-full bg-lime-500 animate-pulse"></span>
          Zyvan 1.0 is now live in production
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="text-6xl md:text-8xl font-extrabold tracking-tighter max-w-4xl leading-[1.1] mb-8"
        >
          Webhook reliability,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">
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
            <div className="absolute inset-0 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            Start building
            <kbd className="hidden sm:inline-flex items-center gap-1 font-sans text-xs bg-white/5 backdrop-blur-sm px-2 py-1 rounded-md text-black/60 ml-2">
              ⌘ K
            </kbd>
          </Link>

          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 font-mono text-sm text-gray-300">
            <span className="text-lime-400">$</span> docker compose up -d
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
          className="mt-24 w-full max-w-5xl rounded-[32px] p-2 bg-gradient-to-b from-white/10 to-transparent shadow-2xl shadow-lime-500/5"
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
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 blur-[100px] rounded-full pointer-events-none" />
              <pre className="font-mono text-sm leading-relaxed text-gray-300">
                <span className="text-lime-400">import</span> &#123; ZyvanClient &#125; <span className="text-lime-400">from</span> <span className="text-emerald-300">'@zyvan/sdk'</span>;
                <br /><br />
                <span className="text-zinc-500">{'// Initialize the client'}</span>
                <br />
                <span className="text-lime-400">const</span> zyvan = <span className="text-lime-400">new</span> <span className="text-white">ZyvanClient</span>(&#123;
                <br />
                {'  '}apiKey: process.env.<span className="text-cyan-300">ZYVAN_API_KEY</span>,
                <br />
                &#125;);
                <br /><br />
                <span className="text-zinc-500">{'// Dispatch an event idempotently'}</span>
                <br />
                <span className="text-lime-400">await</span> zyvan.events.<span className="text-cyan-300">dispatch</span>(&#123;
                <br />
                {'  '}endpoint_id: <span className="text-emerald-300">'ep_9a8b7c6d'</span>,
                <br />
                {'  '}event_type: <span className="text-emerald-300">'payment.succeeded'</span>,
                <br />
                {'  '}idempotencyKey: <span className="text-emerald-300">'idem_xyz_123'</span>,
                <br />
                {'  '}payload: &#123;
                <br />
                {'    '}amount: <span className="text-orange-300">4900</span>,
                <br />
                {'    '}currency: <span className="text-emerald-300">'USD'</span>,
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
                className="absolute right-8 bottom-8 bg-white/5 backdrop-blur-xl backdrop-brightness-50 border border-white/20 p-4 rounded-xl shadow-2xl w-64 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Delivery Status</span>
                  <Activity size={14} className="text-lime-400" />
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
            icon={<ShieldCheck size={24} className="text-lime-400" />}
          />
          <FeatureCard 
            title="Exponential Backoff"
            description="Automated BullMQ delayed job processing with intelligent jitter to prevent downstream server DDoSing."
            icon={<Activity size={24} className="text-emerald-400" />}
          />
          <FeatureCard 
            title="Dead Letter Queues"
            description="Poison messages are isolated into a DLQ schema allowing your team to manually replay them from the dashboard."
            icon={<TerminalSquare size={24} className="text-cyan-400" />}
          />
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">How Zyvan Works</h2>
          <p className="text-gray-400 text-lg">A simple 3-step integration to make your webhooks 100% reliable.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-lime-500/30 to-transparent"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-black border border-white/10 shadow-[0_0_30px_rgba(163,230,53,0.1)] flex items-center justify-center mb-8 relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center border border-lime-500/30">
                <span className="text-2xl font-bold font-mono text-lime-400">1</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Connect</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Route your existing webhooks to your secure Zyvan ingress endpoint. No complex SDKs needed.</p>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-black border border-white/10 shadow-[0_0_30px_rgba(163,230,53,0.1)] flex items-center justify-center mb-8 relative">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30">
                <span className="text-2xl font-bold font-mono text-emerald-400">2</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Process</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Zyvan queues, rate limits, and safely dispatches events to your destination servers.</p>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-black border border-white/10 shadow-[0_0_30px_rgba(163,230,53,0.1)] flex items-center justify-center mb-8 relative">
               <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                <span className="text-2xl font-bold font-mono text-cyan-400">3</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Monitor</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Track every event lifecycle. Replay failures instantly with a click from the dashboard.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 relative z-10 border-t border-white/5 bg-gradient-to-b from-transparent to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">Whether you self-host or use our cloud, we have you covered.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Open Source */}
            <div className="p-8 rounded-[32px] bg-white/5 backdrop-blur-md border border-white/10 flex flex-col">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Self-Hosted</h3>
                  <p className="text-gray-400 text-sm">Deploy on your own infrastructure.</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white">Free Forever</div>
              </div>
              <div className="text-5xl font-bold text-white mb-8">$0 <span className="text-lg text-gray-500 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> Unlimited events</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> Full observability dashboard</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> Automatic retries & DLQ</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> Community support</li>
              </ul>
              <Link href="https://github.com/sultanxdev/zyvan" className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-center transition-colors border border-white/10">
                View on GitHub
              </Link>
            </div>

            {/* Cloud */}
            <div className="p-8 rounded-[32px] bg-gradient-to-b from-lime-500/10 to-emerald-500/5 backdrop-blur-md border border-lime-500/20 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="mb-6 flex justify-between items-start relative z-10">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Zyvan Cloud</h3>
                  <p className="text-lime-200/60 text-sm">Fully managed cluster with enterprise SLAs.</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-lime-500 text-black text-xs font-bold">Coming Soon</div>
              </div>
              <div className="text-5xl font-bold text-white mb-8">Custom <span className="text-lg text-lime-200/60 font-medium">/volume</span></div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300 relative z-10">
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> 99.99% Guaranteed uptime SLA</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> Global multi-region routing</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> Premium support & onboarding</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-lime-400" /> VPC peering & compliance</li>
              </ul>
              <button disabled className="w-full py-4 rounded-xl bg-lime-500 text-black font-semibold text-center transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 relative z-10">
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 max-w-4xl mx-auto relative z-10">
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">Frequently Asked Questions</h2>
        </div>
        
        <div className="space-y-6">
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-3">Is Zyvan open source?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Yes, Zyvan is 100% open source under the MIT license. You can clone the repository, run it on your own servers via Docker Compose, and modify it without restrictions.</p>
          </div>
          
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-3">How does it prevent duplicate events?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">We use an advanced distributed idempotency key system. When your services send a webhook out, if they retry, Zyvan safely drops the duplicate by recognizing the `idempotencyKey` cache stored in Redis.</p>
          </div>
          
          <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <h3 className="text-xl font-semibold text-white mb-3">What happens if my destination endpoint goes offline?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Zyvan will intercept the failure and automatically place the event in an exponential backoff queue. It will progressively retry for up to 3 days. If it still fails, it routes the payload to the Dead Letter Queue for manual review.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="group relative p-8 rounded-3xl bg-white/5 backdrop-blur-md backdrop-brightness-50 border border-white/10 hover:bg-white/10 transition-colors overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:scale-110 group-hover:rotate-12">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-md backdrop-brightness-50 border border-white/10 flex items-center justify-center mb-6">
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
