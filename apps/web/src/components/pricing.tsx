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
      '100,000 events / month',
      'Up to 10 active destinations',
      'At-least-once delivery guarantee',
      'RabbitMQ delayed retries (up to 3 attempts)',
      'HMAC-SHA256 request signing',
      '7 days event audit log retention',
    ],
    buttonText: 'Start Free',
    variant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Scale',
    price: '$49',
    period: 'per month',
    description: 'For fast-growing SaaS products requiring guaranteed webhook durability.',
    features: [
      '2,500,000 events / month',
      'Unlimited customer destinations',
      'Configurable retry policies (up to 10 attempts)',
      'Multi-tenant rate & concurrency limits',
      'Zero-overwrite DLQ & single-click replay',
      '30 days event audit log retention',
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
    description: 'Dedicated infrastructure, custom SLAs, and on-premise compliance.',
    features: [
      'Volume discounts (> 50M events / month)',
      'Dedicated RabbitMQ & PostgreSQL clusters',
      'Custom IP whitelist & dedicated egress IPs',
      'SSO / SAML authentication',
      '99.999% uptime SLA guarantee',
      'Custom audit log retention (up to 1 year)',
      '24/7 dedicated engineering support',
    ],
    buttonText: 'Contact Sales',
    variant: 'outline' as const,
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24 relative">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="pill" className="mb-3">
            Predictable Pricing
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Scale without surprise webhook bills
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Transparent pricing based on successful event throughput. No hidden fees or lock-ins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col justify-between relative transition-all ${
                plan.popular
                  ? 'border-zinc-950 bg-white shadow-xl ring-1 ring-zinc-950 scale-[1.02]'
                  : 'border-border bg-white shadow-xs'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="pill" className="bg-zinc-950 text-white border-transparent px-3 py-0.5 text-[11px] font-semibold shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-6">
                <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-mono tracking-tight text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">/{plan.period}</span>
                </div>
                <CardDescription className="pt-2 text-xs leading-relaxed">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="space-y-3 border-t border-border/80 pt-4">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                    Features Included:
                  </div>
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-700">
                      <Icon icon={CheckmarkCircle02Icon} size={16} className="text-[#00DC5A] mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-4">
                <Button variant={plan.variant} className="w-full h-10 text-sm font-semibold">
                  <span className="flex items-center gap-1.5">
                    {plan.buttonText}
                    <Icon icon={ArrowRight01Icon} size={16} />
                  </span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
