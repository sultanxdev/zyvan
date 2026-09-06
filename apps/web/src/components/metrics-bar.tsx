import React from 'react';
import { Icon } from '@/components/ui/icon';
import {
  FlashIcon,
  ShieldCheckIcon,
  ServerIcon,
  RotateRight01Icon,
} from '@hugeicons/core-free-icons';

const metrics = [
  {
    icon: FlashIcon,
    value: '< 15ms',
    label: 'Durable Acceptance',
    description: 'PostgreSQL atomic commit before returning 202 Accepted',
    color: 'text-indigo-400',
  },
  {
    icon: ShieldCheckIcon,
    value: '99.999%',
    label: 'Delivery Reliability',
    description: 'At-least-once guarantee with zero dropped webhooks',
    color: 'text-emerald-400',
  },
  {
    icon: ServerIcon,
    value: '0 CPU Waste',
    label: 'Delayed AMQP Retries',
    description: 'RabbitMQ TTL + Dead-Letter Exchanges replace database polling',
    color: 'text-purple-400',
  },
  {
    icon: RotateRight01Icon,
    value: '100% Non-Destructive',
    label: 'Replay Lineage',
    description: 'Replays create new deliveries while preserving original attempts',
    color: 'text-amber-400',
  },
];

export function MetricsBar() {
  return (
    <section className="border-y border-border/80 bg-white/75 backdrop-blur-md py-10">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl p-4 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-white border border-border shadow-2xs">
                  <Icon icon={metric.icon} size={20} className="text-zinc-900" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {metric.value}
                </div>
              </div>
              <div className="font-semibold text-sm text-foreground pt-1">
                {metric.label}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {metric.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
