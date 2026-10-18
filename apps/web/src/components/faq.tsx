'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

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
    a: 'Zyvan validates destination URLs and applies real-time DNS pinning and anti-SSRF protections before allowing outbound delivery.',
  },
  {
    q: 'Can I replay a failed webhook?',
    a: 'Yes. Replay creates a new delivery attempt while preserving the original delivery and attempt history with full immutable audit trails.',
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-24 relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14 sm:mb-16"
        >
          <Badge variant="pill" className="mb-3.5 px-3.5 py-1 text-xs text-zinc-600 bg-white/90 border-zinc-200 shadow-xs">
            Technical FAQ
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#17172B] leading-[1.12]">
            Frequently asked{' '}
            <span className="text-[#18181B]">
              questions.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Clear answers to common questions about Zyvan&apos;s webhook delivery platform.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
              >
                <Card className="border-border bg-white overflow-hidden shadow-xs hover:border-zinc-300 transition-colors">
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-secondary/40 transition-colors"
                  >
                    <span className="font-semibold text-sm sm:text-base text-foreground pr-4">
                      {faq.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="text-muted-foreground shrink-0"
                    >
                      <Icon icon={ArrowDown01Icon} size={18} />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <CardContent className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/60">
                          {faq.a}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
