'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

export function CtaBanner() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden font-geist-mono">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Soft Pastel CTA Card */}
        <div className="relative rounded-[32px] border border-[#D6E4FF] bg-gradient-to-b from-[#F3F7FF] via-[#EEF4FF] to-[#E4EFFF] p-8 sm:p-16 text-center shadow-[0_12px_40px_rgba(37,99,235,0.06)] overflow-hidden">
          {/* Soft Diffuse Decorative Circles (Bottom Left & Right) */}
          <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-[#D7E6FF]/80 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-[#D7E6FF]/80 blur-2xl pointer-events-none" />

          {/* Ambient Sparkle Dots */}
          <div className="absolute top-12 left-1/4 size-1.5 rounded-full bg-green-400/40 blur-[0.5px]" />
          <div className="absolute top-20 right-1/4 size-1 rounded-full bg-green-500/50 blur-[0.5px]" />
          <div className="absolute bottom-16 left-1/3 size-1.5 rounded-full bg-purple-400/40 blur-[0.5px]" />
          <div className="absolute bottom-20 right-1/3 size-1.5 rounded-full bg-emerald-400/40 blur-[0.5px]" />

          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            {/* Badge with Logo on the left */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-white/95 px-3.5 py-1.5 shadow-2xs">
                <div className="size-4.5 rounded-md bg-black overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src="/logo.png"
                    alt="Zyvan logo"
                    className="size-full object-cover"
                  />
                </div>
                <span className="text-xs font-semibold text-[#17172B]">
                  Built for developers
                </span>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-[#17172B] leading-[1.15]">
              Stop building webhook reliability yourself.
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto font-normal leading-relaxed">
              Send once. Zyvan handles delivery, retries, signing, and delivery history.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Button
                size="lg"
                asChild
                className="rounded-full h-11 px-8 text-sm bg-[#3B66F5] hover:bg-[#2A52E0] text-white shadow-md font-semibold transition-all hover:shadow-lg hover:scale-[1.02]"
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
                className="rounded-full h-11 px-6 text-sm border-blue-200 bg-white/90 text-zinc-800 hover:bg-white shadow-xs font-semibold"
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
