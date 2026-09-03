import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

export function CtaBanner() {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden font-geist-mono">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="relative rounded-[28px] border border-black/[0.08] bg-gradient-to-br from-[#00DC5A] via-[#00D456] to-[#00BD4C] p-8 sm:p-14 text-center shadow-[0_20px_60px_-15px_rgba(0,220,90,0.35)] overflow-hidden text-[#0A160F]">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/20 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/10 blur-2xl pointer-events-none rounded-full" />

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <Badge
              variant="pill"
              className="px-3.5 py-1 bg-black/10 border-black/15 text-[#0A160F] font-semibold text-xs shadow-2xs"
            >
              Reliable event delivery
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#0A160F] leading-[1.12]">
              Ready to bulletproof your event delivery?
            </h2>

            <p className="text-sm sm:text-base text-[#0A160F]/85 leading-relaxed font-normal max-w-xl mx-auto">
              Start sending events in minutes. Zyvan handles delivery, retries, signing, and delivery history.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
              <Button
                size="lg"
                asChild
                className="rounded-full h-11 px-7 text-sm bg-zinc-950 text-white hover:bg-zinc-900 shadow-md font-semibold transition-transform hover:scale-[1.02]"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <span>Start building</span>
                  <Icon icon={ArrowRight01Icon} size={16} />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-full h-11 px-6 text-sm border-black/15 bg-white/95 text-zinc-950 hover:bg-white shadow-xs font-semibold"
              >
                <Link href="/docs" className="flex items-center gap-2">
                  <span>Read the docs</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
