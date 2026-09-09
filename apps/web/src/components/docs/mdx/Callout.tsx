'use client';

import React from 'react';
import {
  Info,
  Lightbulb,
  AlertTriangle,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';

interface CalloutProps {
  type?: 'note' | 'tip' | 'warning' | 'danger' | 'security';
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = 'note', title, children }: CalloutProps) {
  const configs = {
    note: {
      border: 'border-[#00DC5A]/30',
      bg: 'bg-[#00DC5A]/[0.06]',
      glow: 'shadow-[0_0_20px_rgba(0,220,90,0.06)]',
      titleColor: 'text-[#00DC5A]',
      iconColor: 'text-[#00DC5A]',
      defaultTitle: 'Note',
      Icon: Info,
    },
    tip: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
      titleColor: 'text-emerald-400',
      iconColor: 'text-emerald-400',
      defaultTitle: 'Pro Tip',
      Icon: Lightbulb,
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
      titleColor: 'text-amber-400',
      iconColor: 'text-amber-400',
      defaultTitle: 'Warning',
      Icon: AlertTriangle,
    },
    danger: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-950/20',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
      titleColor: 'text-rose-400',
      iconColor: 'text-rose-400',
      defaultTitle: 'Caution',
      Icon: AlertOctagon,
    },
    security: {
      border: 'border-[#00DC5A]/40',
      bg: 'bg-[#00DC5A]/[0.08]',
      glow: 'shadow-[0_0_20px_rgba(0,220,90,0.08)]',
      titleColor: 'text-[#00DC5A]',
      iconColor: 'text-[#00DC5A]',
      defaultTitle: 'Security Best Practice',
      Icon: ShieldCheck,
    },
  };

  const config = configs[type] || configs.note;
  const Icon = config.Icon;

  return (
    <div
      className={`my-6 rounded-xl border ${config.border} ${config.bg} ${config.glow} p-4.5 backdrop-blur-sm transition-all font-geist-mono font-mono`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className={`text-sm font-semibold tracking-tight ${config.titleColor} mb-1.5`}>
            {title || config.defaultTitle}
          </h5>
          <div className="text-sm text-zinc-300 leading-relaxed prose-strong:text-zinc-100 prose-code:text-emerald-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
