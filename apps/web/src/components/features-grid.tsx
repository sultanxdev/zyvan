import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  ShieldCheckIcon,
  Database01Icon,
  ServerIcon,
  RotateRight01Icon,
  FlashIcon,
  LockKeyIcon,
  Settings01Icon,
  FirewallIcon,
} from '@hugeicons/core-free-icons';

const features = [
  {
    icon: Database01Icon,
    title: 'Database-Level Idempotency',
    badge: 'Integrity',
    description:
      'Guaranteed by PostgreSQL UNIQUE(project_id, idempotency_key). Duplicate incoming requests safely return the existing event without triggering double deliveries or phantom charges.',
    colSpan: 'lg:col-span-2',
    accent: 'text-indigo-400',
  },
  {
    icon: ServerIcon,
    title: 'RabbitMQ Delayed Retries',
    badge: 'Zero Polling',
    description:
      'Native AMQP message TTL and Dead-Letter Exchanges replace inefficient SQL polling loops. Retries wait in dedicated queues with zero CPU consumption.',
    colSpan: 'lg:col-span-1',
    accent: 'text-purple-400',
  },
  {
    icon: ShieldCheckIcon,
    title: 'AES-256-GCM + HMAC-SHA256',
    badge: 'Security',
    description:
      'Signing secrets are encrypted at rest using AES-256-GCM. Outbound requests are signed with standard timestamped HMAC-SHA256 headers to prevent spoofing and replay attacks.',
    colSpan: 'lg:col-span-1',
    accent: 'text-emerald-400',
  },
  {
    icon: RotateRight01Icon,
    title: 'Zero-Overwrite DLQ & Replay',
    badge: 'Audit Trail',
    description:
      'When retries are exhausted, the delivery enters DLQ. Replaying creates a new Delivery record linked to the event, preserving historical attempt logs with zero data loss.',
    colSpan: 'lg:col-span-2',
    accent: 'text-amber-400',
  },
  {
    icon: FirewallIcon,
    title: 'True SSRF DNS Guard',
    badge: 'Network Defense',
    description:
      'Destination URLs are strictly validated via true DNS resolution, permanently preventing internal network port scans, loopback targeting, and cloud metadata theft (169.254.169.254).',
    colSpan: 'lg:col-span-1',
    accent: 'text-rose-400',
  },
  {
    icon: Settings01Icon,
    title: 'Multi-Tenant Isolation',
    badge: 'Concurrency Guard',
    description:
      'Enforce independent concurrency limits and per-second rate limits on customer tenants, eliminating noisy-neighbor starvation across high-volume accounts.',
    colSpan: 'lg:col-span-1',
    accent: 'text-cyan-400',
  },
  {
    icon: FlashIcon,
    title: 'Bounded Prefetch Concurrency',
    badge: 'Worker Scale',
    description:
      'Workers pull tasks based on strict AMQP prefetch channels, guaranteeing that sudden traffic spikes never cause worker memory leaks or event drops.',
    colSpan: 'lg:col-span-1',
    accent: 'text-yellow-400',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 sm:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="pill" className="mb-4">
            Reliability Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Built for engineering teams with zero tolerance for dropped events
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Every layer of Zyvan is designed around durability, security, and developer clarity.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card
              key={i}
              className={`${feature.colSpan} bg-white border border-border hover:border-zinc-400 hover:shadow-md transition-all relative flex flex-col justify-between overflow-hidden shadow-xs`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary border border-border">
                    <Icon icon={feature.icon} size={20} className="text-zinc-900" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-white">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-foreground font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
