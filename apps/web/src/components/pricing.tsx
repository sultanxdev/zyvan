'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { CheckmarkCircle02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

const plans = [
  {
    name: 'Developer',
    price: '$0',
    period: 'free forever',
    description: 'Perfect for indie hackers, hobby projects, and early-stage prototypes.',
    features: [
      '100,000 webhook deliveries / month',
      'Up to 10 active destinations',
      'At-least-once delivery',
      'Automatic retries (up to 3 attempts)',
      'HMAC-SHA256 request signing',
      '7 days delivery history retention',
    ],
    buttonText: 'Start Free',
    variant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Scale',
    price: '$49',
    period: 'per month',
    description: 'For growing products that need reliable webhook delivery at scale.',
    features: [
      '2.5M webhook deliveries / month',
      'Unlimited customer destinations',
      'Configurable retry policies',
      'Multi-tenant rate & concurrency limits',
      'Dead-letter queue & safe replays',
      '30 days delivery history retention',
      'Priority email & Slack support',
    ],
    buttonText: 'Start 14-Day Free Trial',
    variant: 'glow' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'annual billing',
    description: 'Custom volumes, dedicated infrastructure, and tailored support.',
    features: [
      'Custom delivery volume tiers',
      'Dedicated RabbitMQ & PostgreSQL clusters',
      'Custom IP whitelist & dedicated egress IPs',
      'SSO / SAML authentication',
      'Custom delivery retention policies',
      '24/7 dedicated engineering support',
    ],
    buttonText: 'Contact Sales',
    variant: 'outline' as const,
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24 relative font-geist-mono">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <Badge variant="pill" className="mb-3.5 px-3.5 py-1 text-xs text-zinc-600 bg-white/90 border-zinc-200 shadow-xs">
            Predictable Pricing
          </Badge>
          <h2
            className="text-3xl sm:text-5xl font-normal tracking-tight text-[#17172B] leading-[1.12]"
            style={{ fontFamily: "var(--font-serif, 'Newsreader', Georgia, serif)" }}
          >
            Scale without{' '}
            <span className="italic text-[#18181B]">
              surprise webhook bills.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Simple pricing based on webhook volume. No hidden fees or infrastructure charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col justify-between relative transition-all ${plan.popular
                  ? 'border-zinc-950 bg-white shadow-xl ring-1 ring-zinc-950 scale-[1.02]'
                  : 'border-border bg-white shadow-xs'
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="pill" className="bg-zinc-950 text-white font-mono text-[10px] tracking-wider uppercase px-3 py-0.5 border-0">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="p-6 sm:p-8">
                <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-mono">{plan.price}</span>
                  <span className="text-xs font-mono text-muted-foreground">/{plan.period}</span>
                </div>
                <CardDescription className="mt-4 text-xs leading-relaxed text-muted-foreground">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="p-6 sm:p-8 pt-0 flex-1">
                <div className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-4">
                  Features Included:
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                      <Icon icon={CheckmarkCircle02Icon} size={15} className="text-[#00DC5A] shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-6 sm:p-8 pt-0">
                <Button
                  variant={plan.popular ? 'default' : 'outline'}
                  className={`w-full h-11 rounded-xl text-xs font-semibold cursor-pointer ${plan.popular ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    }`}
                >
                  <span>{plan.buttonText}</span>
                  <Icon icon={ArrowRight01Icon} size={14} className="ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
