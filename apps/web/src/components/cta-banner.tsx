import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';

export function CtaBanner() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 via-card to-card/90 p-8 sm:p-12 lg:p-16 text-center shadow-[0_0_50px_-15px_rgba(99,102,241,0.3)] overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <Badge variant="pill" className="px-3 py-1">
              Zero Dropped Webhooks
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Ready to bulletproof your event delivery?
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Start integrating in 2 minutes. Accept events durably in 15ms, automate retries with RabbitMQ, and get full visibility.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button variant="glow" size="lg" asChild className="h-12 px-8 text-base">
                <Link href="#simulator" className="flex items-center gap-2">
                  <span>Launch Live Simulator</span>
                  <Icon icon={PlayIcon} size={18} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-12 px-6 text-base">
                <Link href="#quickstart" className="flex items-center gap-2">
                  <span>Read Quickstart</span>
                  <Icon icon={ArrowRight01Icon} size={18} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
