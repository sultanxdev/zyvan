'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';

const faqs = [
  {
    q: 'How does Zyvan ensure events are never lost?',
    a: 'When an event is sent to Zyvan, it is first written to PostgreSQL in an atomic transaction before entering the delivery queue. If a worker or queue node restarts, the event remains safely stored in durable persistence. Delivery workers only acknowledge events after verified HTTP delivery or persistent retry scheduling.',
  },
  {
    q: 'How does Zyvan handle duplicate events?',
    a: 'Zyvan enforces uniqueness constraints on (project_id, idempotency_key). If a duplicate request arrives, Zyvan detects the existing record, avoids duplicate delivery dispatches, and returns the original event record immediately.',
  },
  {
    q: 'How does Zyvan handle retries?',
    a: 'Zyvan schedules retries through native queue timers (RabbitMQ per-message TTL and Dead-Letter Exchanges) rather than continuous database polling. This eliminates database lock contention and allows retry backoff with jitter to execute smoothly at high volume.',
  },
  {
    q: 'How does Zyvan protect webhook destinations?',
    a: 'Every request is cryptographically signed using HMAC-SHA256 with tenant-specific signing secrets. Zyvan also performs DNS resolution checks to block Server-Side Request Forgery (SSRF) against internal networks, loopback addresses, and cloud instance metadata endpoints.',
  },
  {
    q: 'Can I replay failed events without losing history?',
    a: 'Yes. Zyvan creates a new delivery record linked to the replay without overwriting previous attempts. The complete audit timeline of timestamps, response codes, latencies, and error payloads remains fully preserved.',
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-24 relative font-geist-mono">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <Badge variant="pill" className="mb-3.5 px-3.5 py-1 text-xs text-zinc-600 bg-white/90 border-zinc-200 shadow-xs">
            Technical FAQ
          </Badge>
          <h2
            className="text-3xl sm:text-5xl font-normal tracking-tight text-[#17172B] leading-[1.12] font-geist-mono"
            style={{ fontFamily: "var(--font-geist-mono, 'Newsreader', Georgia, serif)" }}
          >
            Frequently asked{' '}
            <span className="font-geist-mono text-[#18181B]">
              questions.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Clear technical answers to common questions about Zyvan&apos;s reliability architecture.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <Card
                key={idx}
                className="border-border bg-white overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-semibold text-sm sm:text-base text-foreground pr-4">
                    {faq.q}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    <Icon icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon} size={18} />
                  </span>
                </button>
                {isOpen && (
                  <CardContent className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/60">
                    {faq.a}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
