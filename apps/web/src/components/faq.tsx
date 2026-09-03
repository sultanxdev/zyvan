'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';

const faqs = [
  {
    q: 'How does Zyvan guarantee at-least-once delivery?',
    a: 'When an event is sent to POST /v1/events, Zyvan first writes the event and associated delivery records to PostgreSQL in an atomic transaction before publishing to RabbitMQ. If the API server or queue node crashes at any point, the event is safely recorded in durable storage. Workers only acknowledge messages after successful HTTP delivery or when scheduling a persistent retry.',
  },
  {
    q: 'What happens when a duplicate idempotency key is received?',
    a: 'Zyvan uses a database-level uniqueness constraint: UNIQUE(project_id, idempotency_key). If a second request arrives with an existing key, the API catches the unique violation, skips queue dispatch, and immediately returns the existing event record with HTTP 200 OK ({ duplicate: true }). No duplicate webhooks or phantom billing deliveries can ever occur.',
  },
  {
    q: 'Why RabbitMQ TTL + Dead-Letter Exchanges instead of database polling?',
    a: 'Database polling (SELECT * FROM deliveries WHERE retry_at <= NOW()) causes table lock contention, burns CPU cycles, and struggles to scale under thousands of concurrent retries. RabbitMQ natively supports per-message TTL in a dedicated retry queue. When the timer expires, the AMQP broker routes the message back to the active delivery queue via DLX with zero polling overhead.',
  },
  {
    q: 'How does the Replay mechanism preserve delivery history?',
    a: 'Unlike naive webhook tools that reset attempt_count = 0 on the existing delivery (overwriting historical logs), Zyvan creates a brand-new Delivery record and a linked Replay record. All previous attempts, status codes, latencies, and error traces remain completely intact in the PostgreSQL audit log.',
  },
  {
    q: 'How does Zyvan defend against Server-Side Request Forgery (SSRF)?',
    a: 'When creating or updating a destination URL, Zyvan performs an actual DNS lookup and validates the resolved IP address against private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback addresses (127.0.0.0/8, ::1), and cloud metadata endpoints (169.254.169.254). Any destination resolving to internal IPs is rejected with HTTP 400 invalid_request.',
  },
  {
    q: 'Can I self-host Zyvan?',
    a: 'Yes. The entire Zyvan backend is fully open-source and comes with a production-ready docker-compose.yml including PostgreSQL, RabbitMQ, and Redis. You can run the entire infrastructure on your own cloud with npm run dev:api and npm run dev:worker.',
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-24 relative">
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
