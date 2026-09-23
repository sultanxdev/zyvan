'use client';

import React from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface CalloutProps {
  type?: 'info' | 'tip' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
}

const CALLOUT_STYLES = {
  info: {
    icon: Info,
    border: 'border-blue-500/30',
    bg: 'bg-blue-950/20',
    titleColor: 'text-blue-400',
    iconColor: 'text-blue-400',
    badge: 'INFO',
  },
  tip: {
    icon: CheckCircle,
    border: 'border-[#22C55E]/30',
    bg: 'bg-[#22C55E]/10',
    titleColor: 'text-[#22C55E]',
    iconColor: 'text-[#22C55E]',
    badge: 'TIP',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-500/30',
    bg: 'bg-amber-950/20',
    titleColor: 'text-amber-400',
    iconColor: 'text-amber-400',
    badge: 'WARNING',
  },
  danger: {
    icon: AlertCircle,
    border: 'border-red-500/30',
    bg: 'bg-red-950/20',
    titleColor: 'text-red-400',
    iconColor: 'text-red-400',
    badge: 'CAUTION',
  },
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.info;
  const IconComponent = style.icon;

  return (
    <div
      role="note"
      className={clsx(
        'my-6 rounded-lg border p-4 text-sm font-mono',
        style.border,
        style.bg
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <IconComponent className={clsx('w-4 h-4 shrink-0', style.iconColor)} aria-hidden="true" />
        <span className={clsx('font-semibold text-xs uppercase tracking-wider', style.titleColor)}>
          {title || style.badge}
        </span>
      </div>
      <div className="text-zinc-300 leading-relaxed pl-6 space-y-2 text-xs sm:text-sm">
        {children}
      </div>
    </div>
  );
}
