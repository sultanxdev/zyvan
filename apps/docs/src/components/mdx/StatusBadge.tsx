'use client';

import React from 'react';
import clsx from 'clsx';

export type DeliveryStatusType = 'delivered' | 'queued' | 'retrying' | 'failed' | 'scheduled' | 'dead_letter';

interface StatusBadgeProps {
  status: DeliveryStatusType | string;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    icon: string;
    text: string;
    bg: string;
    border: string;
    textCol: string;
    animate?: boolean;
  }
> = {
  delivered: {
    icon: '✓',
    text: 'Delivered',
    bg: 'bg-[#22C55E]/10',
    border: 'border-[#22C55E]/30',
    textCol: 'text-[#22C55E]',
    animate: false,
  },
  queued: {
    icon: '●',
    text: 'Queued',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    textCol: 'text-blue-400',
    animate: false,
  },
  scheduled: {
    icon: '●',
    text: 'Scheduled',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    textCol: 'text-cyan-400',
    animate: false,
  },
  retrying: {
    icon: '↻',
    text: 'Retrying',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    textCol: 'text-amber-400',
    animate: true,
  },
  failed: {
    icon: '!',
    text: 'Failed',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    textCol: 'text-red-400',
    animate: false,
  },
  dead_letter: {
    icon: '!',
    text: 'Dead Letter',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    textCol: 'text-purple-400',
    animate: false,
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/-/g, '_');
  const config = STATUS_CONFIG[normalized] || {
    icon: '•',
    text: label || status,
    bg: 'bg-zinc-800/40',
    border: 'border-zinc-700/50',
    textCol: 'text-zinc-300',
    animate: false,
  };

  const displayText = label || config.text;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium border',
        config.bg,
        config.border,
        config.textCol,
        className
      )}
    >
      <span
        aria-hidden="true"
        className={clsx('font-bold text-[10px]', config.animate && 'motion-safe:animate-spin')}
      >
        {config.icon}
      </span>
      <span>{displayText}</span>
    </span>
  );
}
