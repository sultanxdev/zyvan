'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  GithubIcon,
  Search01Icon,
  Book01Icon,
  FlashIcon,
  ShieldCheckIcon,
  ServerIcon,
  Database01Icon,
  RotateRight01Icon,
  ArrowRight01Icon,
  DashboardSquare01Icon,
} from '@hugeicons/core-free-icons';

interface DocSection {
  title: string;
  items: { id: string; label: string; badge?: string }[];
}

const docSections: DocSection[] = [
  {
    title: 'GETTING STARTED',
    items: [
      { id: 'overview', label: 'Overview & Architecture' },
      { id: 'quickstart', label: '5-Minute Quickstart', badge: 'Start Here' },
      { id: 'core-concepts', label: 'Core Invariants & Concepts' },
    ],
  },
  {
    title: 'AUTHENTICATION & SECURITY',
    items: [
      { id: 'api-keys', label: 'API Keys & Scopes' },
      { id: 'signature-verification', label: 'HMAC-SHA256 Verification' },
      { id: 'ssrf-guard', label: 'SSRF & Network Hardening' },
    ],
  },
  {
    title: 'REST API REFERENCE',
    items: [
      { id: 'api-post-events', label: 'POST /v1/events (Ingest)' },
      { id: 'api-get-events', label: 'GET /v1/events (List)' },
      { id: 'api-destinations', label: 'POST /v1/destinations' },
      { id: 'api-dlq', label: 'GET /v1/dead-letters' },
      { id: 'api-replay', label: 'POST /v1/events/:id/replay' },
    ],
  },
  {
    title: 'QUEUE & AMQP RETRY MECHANICS',
    items: [
      { id: 'rabbitmq-topology', label: 'RabbitMQ Exchange Topology' },
      { id: 'backoff-jitter', label: 'Exponential Backoff & Jitter' },
      { id: 'dlq-lifecycle', label: 'Zero-Overwrite DLQ Model' },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  const filteredSections = docSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((sec) => sec.items.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-zinc-950 selection:text-white">
      {/* ─── Docs Top Navigation ────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo Lockup */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative size-8 rounded-xl overflow-hidden shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center bg-black">
                <img
                  src="/logo.png"
                  alt="Zyvan logo"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-foreground lowercase">zyvan</span>
                <span className="text-zinc-400 font-mono text-sm">/</span>
                <span className="font-semibold text-sm text-zinc-800 font-mono">docs</span>
                <Badge variant="pill" className="text-[10px] px-1.5 py-0 uppercase font-mono">v0.1.0</Badge>
              </div>
            </Link>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/sultanxdev/zyvan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center size-9 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="GitHub Repository"
            >
              <Icon icon={GithubIcon} size={18} />
            </a>

            <Button variant="outline" size="sm" asChild className="text-xs bg-white">
              <Link href="/dashboard/simulator">Live Simulator</Link>
            </Button>

            <Button variant="glow" size="sm" asChild>
              <Link href="/dashboard" className="flex items-center gap-1.5 text-xs">
                <Icon icon={DashboardSquare01Icon} size={15} />
                <span>Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Docs Body ─────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-start gap-8 py-8">
        {/* Left Sticky Sidebar */}
        <aside className="w-64 shrink-0 sticky top-24 hidden md:block max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-6">
          {/* Quick Search */}
          <div className="relative">
            <Icon icon={Search01Icon} size={15} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs &amp; endpoints..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 font-mono placeholder:text-zinc-400"
            />
          </div>

          {/* Navigation Tree */}
          <div className="space-y-6">
            {filteredSections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-[11px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                  {sec.title}
                </h4>
                <ul className="space-y-1">
                  {sec.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                          activeSection === item.id
                            ? 'bg-zinc-950 text-white font-semibold shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-950 hover:bg-secondary/70'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00DC5A] text-zinc-950 font-bold shrink-0 ml-1.5">
                            {item.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Documentation Article */}
        <main className="flex-1 min-w-0 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}
