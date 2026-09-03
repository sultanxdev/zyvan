import { TextHoverEffect } from '@/components/ui/text-hover-effect';

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-white/70 backdrop-blur-xl mb-0 pb-0 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative size-8 rounded-xl overflow-hidden shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center bg-black">
                <img
                  src="/logo.png"
                  alt="Zyvan logo"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground lowercase">zyvan</span>
            </Link>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Multi-tenant webhook reliability engine built on PostgreSQL, RabbitMQ, and Node.js.
              Durably accept events, asynchronously deliver with retries, and preserve full audit history.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-zinc-600">All Systems Operational (99.99%)</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="font-semibold text-xs text-foreground uppercase tracking-wider font-mono">
              Product
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-foreground transition-colors">
                  How It Works
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
            <div className="font-semibold text-xs text-foreground uppercase tracking-wider font-mono">
              Resources
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/docs" className="hover:text-foreground transition-colors font-semibold text-zinc-900">
                  Developer Documentation
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
                <span className="text-zinc-400">API Status</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <div>
            &copy; {new Date().getFullYear()} Zyvan Infrastructure. Open source under MIT License.
          </div>
          <div className="flex items-center gap-4">
            <span>Built with Next.js, Tailwind, &amp; Hugeicons</span>
          </div>
        </div>
      </div>

      {/* Large hover-effect text constrained to container with zero bottom gap */}
      <div className="w-full flex items-end justify-center select-none overflow-hidden -mb-1 max-w-[1200px] mx-auto px-4">
        <TextHoverEffect text="ZYVAN" duration={0.3} />
      </div>
    </footer>
  );
}
