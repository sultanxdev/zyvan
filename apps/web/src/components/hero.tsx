'use client';

import React from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { HeroDashboardPreview } from '@/components/hero-dashboard-preview';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: 'easeOut',
    },
  },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 md:pt-40 md:pb-20">
      {/* Dynamic Animated Glow Backdrop */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.6, 0.85, 0.6],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#00DC5A]/15 via-emerald-500/5 to-transparent blur-3xl pointer-events-none -z-10"
      />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center gap-5 max-w-4xl mx-auto"
        >
          {/* Version / Launch Pill */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300/80 bg-white/95 px-3.5 py-1.5 text-xs font-medium text-zinc-800 shadow-xs hover:border-zinc-400 transition-colors">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DC5A] opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-[#00DC5A]" />
              </span>
              <span className="font-semibold font-mono">zyvan v0.1</span>
              <span className="text-muted-foreground">•</span>
              <span>Reliable webhook delivery</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl lg:text-[72px] font-extrabold tracking-[-0.035em] text-[#111113] leading-[1.05]"
          >
            Webhooks fail.{' '}
            <span className="font-normal text-[#27272A] block sm:inline">
              Your infrastructure shouldn&apos;t.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg lg:text-xl text-zinc-600 max-w-2xl leading-relaxed"
          >
            Send once. Zyvan delivers your webhooks, retries failures, and keeps every attempt traceable.
          </motion.p>

          {/* Dual Action CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-3.5 pt-2"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                asChild
                className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-sm px-6 h-11 shadow-sm font-medium"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <span>Start building</span>
                  <Icon icon={ArrowRight01Icon} size={16} />
                </Link>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-full border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 text-sm px-6 h-11 font-medium shadow-xs"
              >
                <Link href="/docs" className="flex items-center gap-2">
                  <span>Read the docs</span>
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* 4 Feature Trust Checks */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-zinc-700"
          >
            {[
              'Automatic retries',
              'HMAC signing',
              'Idempotency',
              'Delivery history',
            ].map((feature, i) => (
              <motion.span
                key={feature}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1.5 cursor-default"
              >
                <Icon icon={CheckmarkCircle02Icon} size={15} className="text-[#00DC5A]" />
                {feature}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero Interactive Dashboard Visualizer */}
        <HeroDashboardPreview />
      </div>
    </section>
  );
}
