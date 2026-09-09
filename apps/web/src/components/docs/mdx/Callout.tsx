'use client';

import React from 'react';
import {
  InformationCircleIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface CalloutProps {
  type?: 'note' | 'tip' | 'warning' | 'danger' | 'security';
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = 'note', title, children }: CalloutProps) {
  const configs = {
    note: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-950/20',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.08)]',
      titleColor: 'text-blue-400',
      iconColor: 'text-blue-400',
      defaultTitle: 'Note',
      Icon: InformationCircleIcon,
    },
    tip: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
      titleColor: 'text-emerald-400',
      iconColor: 'text-emerald-400',
      defaultTitle: 'Pro Tip',
      Icon: LightBulbIcon,
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
      titleColor: 'text-amber-400',
      iconColor: 'text-amber-400',
      defaultTitle: 'Warning',
      Icon: ExclamationTriangleIcon,
    },
    danger: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-950/20',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
      titleColor: 'text-rose-400',
      iconColor: 'text-rose-400',
      defaultTitle: 'Caution',
      Icon: XCircleIcon,
    },
    security: {
      border: 'border-violet-500/30',
      bg: 'bg-violet-950/20',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.08)]',
      titleColor: 'text-violet-400',
      iconColor: 'text-violet-400',
      defaultTitle: 'Security Best Practice',
      Icon: ShieldCheckIcon,
    },
  };

  const config = configs[type] || configs.note;
  const Icon = config.Icon;

  return (
    <div
      className={`my-6 rounded-xl border ${config.border} ${config.bg} ${config.glow} p-4.5 backdrop-blur-sm transition-all`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className={`text-sm font-semibold tracking-tight ${config.titleColor} mb-1.5`}>
            {title || config.defaultTitle}
          </h5>
          <div className="text-sm text-zinc-300 leading-relaxed font-sans prose-strong:text-zinc-100 prose-code:text-amber-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
