'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';

const faqs = [
  {
    q: 'How does Zyvan protect against event loss?',
    a: 'Zyvan stores the event and its delivery records in PostgreSQL before delivery begins. This keeps the accepted request in durable storage even if the queue or worker is temporarily unavailable.',
  },
  {
    q: 'How does Zyvan handle duplicate webhooks?',
    a: 'Zyvan uses database-level idempotency keys to prevent the same request from creating duplicate delivery work.',
  },
  {
    q: 'How does Zyvan handle retries?',
    a: 'Temporary failures such as timeouts and 5xx responses are retried using configurable backoff. Failed deliveries can be inspected and replayed from their delivery history.',
  },
  {
    q: 'How does Zyvan protect webhook destinations?',
    a: 'Zyvan validates destination URLs and applies SSRF protections before allowing outbound delivery.',
  },
  {
    q: 'Can I replay a failed webhook?',
    a: 'Yes. Replay creates a new delivery attempt while preserving the original delivery and attempt history.',
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
            className="text-3xl sm:text-5xl font-normal tracking-tight text-[#17172B] leading-[1.12]"
            style={{ fontFamily: "var(--font-serif, 'Newsreader', Georgia, serif)" }}
          >
            Frequently asked{' '}
            <span className="italic text-[#18181B]">
              questions.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Clear answers to common questions about Zyvan&apos;s webhook delivery platform.
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
