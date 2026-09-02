'use client';

import React from 'react';
import { LatencyMetric } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Clock01Icon, ZapIcon, ShieldCheckIcon } from '@hugeicons/core-free-icons';

interface LatencyChartProps {
  metrics: LatencyMetric;
}

export function LatencyChart({ metrics }: LatencyChartProps) {
  // Generate simple smooth SVG sparkline path
  const points = metrics.history;
  const maxVal = Math.max(...points.map((p) => p.value), 40);
  const minVal = 10;
  const width = 240;
  const height = 60;

  const svgPoints = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p.value - minVal) / (maxVal - minVal)) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Card className="bg-white border-border shadow-xs flex flex-col justify-between">
      <CardHeader className="p-5 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground font-semibold flex items-center gap-1.5">
            <span>Ingestion &amp; Queue Latency</span>
          </CardTitle>
          <Badge variant="pill" className="text-[10px] font-mono">
            p50 &lt; 15ms
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Synchronous write to PostgreSQL + persistent publish to RabbitMQ
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 pt-1 space-y-4">
        {/* Latency Percentiles Grid */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-secondary/30 font-mono text-xs border border-border/50">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">p50 MEDIAN</span>
            <strong className="text-zinc-950 text-base">{metrics.p50}ms</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">p95 TAIL</span>
            <strong className="text-zinc-950 text-base">{metrics.p95}ms</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">p99 MAX</span>
            <strong className="text-zinc-950 text-base">{metrics.p99}ms</strong>
          </div>
        </div>

        {/* Latency Trendline Sparkline */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Historical p50 Response Time</span>
            <span className="text-zinc-800 font-semibold">{metrics.avg}ms avg</span>
          </div>

          <div className="w-full h-16 bg-secondary/20 rounded-lg p-2 flex items-center justify-center border border-border/40">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00DC5A" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00DC5A" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke="#111113"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={svgPoints}
              />
            </svg>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-600/20 text-[11px] font-mono text-emerald-800 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#00DC5A] animate-pulse shrink-0" />
          <span>PostgreSQL write committed before 202 Accepted return</span>
        </div>
      </CardContent>
    </Card>
  );
}
