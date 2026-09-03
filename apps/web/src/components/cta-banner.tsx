import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';

export function CtaBanner() {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="relative rounded-3xl border border-zinc-900 bg-zinc-950 p-8 sm:p-12 text-center shadow-2xl overflow-hidden text-white">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00DC5A]/10 blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <Badge variant="pill" className="px-3 py-1 bg-zinc-900 border-zinc-700 text-zinc-300">
              Zero Dropped Webhooks
            </Badge>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              Ready to bulletproof your event delivery?
            </h2>

            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Start integrating in 2 minutes. Accept events durably in 15ms, automate retries with RabbitMQ, and get full operational visibility.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Button size="lg" asChild className="rounded-full h-11 px-7 text-sm bg-white text-zinc-950 hover:bg-zinc-100 shadow-lg font-semibold">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <span>Get Started Now</span>
                  <Icon icon={ArrowRight01Icon} size={16} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-12 px-6 text-base border-zinc-700 bg-zinc-900/80 text-white hover:bg-zinc-800 hover:text-white">
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
