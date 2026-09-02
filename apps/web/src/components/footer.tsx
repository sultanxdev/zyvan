import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { ServerIcon, GithubIcon } from '@hugeicons/core-free-icons';

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-[0_0_15px_-3px_rgba(99,102,241,0.6)]">
                <Icon icon={ServerIcon} size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">Zyvan</span>
            </Link>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Multi-tenant webhook reliability engine built on PostgreSQL, RabbitMQ, and Node.js.
              Durably accept events, asynchronously deliver with retries, and preserve full audit history.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-zinc-400">All Systems Operational (99.99%)</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="font-semibold text-xs text-white uppercase tracking-wider font-mono">
              Product
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#architecture" className="hover:text-foreground transition-colors">
                  Reliability Engine
                </Link>
              </li>
              <li>
                <Link href="#simulator" className="hover:text-foreground transition-colors">
                  Webhook Simulator
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-foreground transition-colors">
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Docs */}
          <div className="space-y-3">
            <div className="font-semibold text-xs text-white uppercase tracking-wider font-mono">
              Resources
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="#quickstart" className="hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/sultanxdev/zyvan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Icon icon={GithubIcon} size={14} />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <Link href="#faq" className="hover:text-foreground transition-colors">
                  Technical FAQ
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">API Status</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <div>
            &copy; {new Date().getFullYear()} Zyvan Infrastructure. Open source under MIT License.
          </div>
          <div className="flex items-center gap-4">
            <span>Built with Next.js, Tailwind, &amp; Hugeicons</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
