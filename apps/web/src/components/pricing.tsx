'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { CheckmarkCircle02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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
      popular: false,
    },
    {
      name: 'Scale',
      price: billingCycle === 'annual' ? '$39' : '$49',
      period: billingCycle === 'annual' ? 'month, billed annually' : 'per month',
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
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-24 relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-10 sm:mb-12"
        >
          <Badge variant="pill" className="mb-3.5 px-3.5 py-1 text-xs text-zinc-600 bg-white/90 border-zinc-200 shadow-xs">
            Predictable Pricing
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#17172B] leading-[1.12]">
            Scale without{' '}
            <span className="text-[#18181B]">
              surprise webhook bills.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Simple pricing based on webhook volume. No hidden fees or infrastructure charges.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center rounded-full border border-black/[0.08] bg-zinc-100/90 p-1 text-xs font-medium">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative px-4 py-1.5 rounded-full transition-colors cursor-pointer ${
                  billingCycle === 'monthly' ? 'text-zinc-950 font-semibold' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {billingCycle === 'monthly' && (
                  <motion.div
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-white rounded-full shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Monthly billing</span>
              </button>

              <button
                onClick={() => setBillingCycle('annual')}
                className={`relative px-4 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'annual' ? 'text-zinc-950 font-semibold' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {billingCycle === 'annual' && (
                  <motion.div
                    layoutId="billing-pill"
                    className="absolute inset-0 bg-white rounded-full shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Annual billing</span>
                <span className="relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className="flex"
            >
              <Card
                className={`w-full flex flex-col justify-between relative transition-all ${
                  plan.popular
                    ? 'border-zinc-950 bg-white shadow-xl ring-1 ring-zinc-950'
                    : 'border-border bg-white shadow-xs hover:border-zinc-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="pill" className="bg-zinc-950 text-white font-mono text-[10px] tracking-wider uppercase px-3 py-0.5 border-0 shadow-xs">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="p-6 sm:p-8">
                  <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                  <div className="mt-4 flex items-baseline gap-1">
                    <motion.span
                      key={plan.price}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-mono"
                    >
                      {plan.price}
                    </motion.span>
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
                    className={`w-full h-11 rounded-xl text-xs font-semibold cursor-pointer ${
                      plan.popular ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <span>{plan.buttonText}</span>
                    <Icon icon={ArrowRight01Icon} size={14} className="ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
