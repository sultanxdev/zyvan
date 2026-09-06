'use client';

import React, { useState } from 'react';
import { ThroughputPoint } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { ChartHistogramIcon, Clock01Icon } from '@hugeicons/core-free-icons';

interface DeliveryChartProps {
  data: ThroughputPoint[];
  range: '24h' | '7d';
  onRangeChange: (r: '24h' | '7d') => void;
}

export function DeliveryChart({ data, range, onRangeChange }: DeliveryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ThroughputPoint | null>(null);

  const maxVal = Math.max(...data.map((d) => d.total), 100);
  const totalDelivered = data.reduce((acc, d) => acc + d.delivered, 0);
  const totalRetrying = data.reduce((acc, d) => acc + d.retrying, 0);
  const totalFailed = data.reduce((acc, d) => acc + d.failed, 0);
  const totalEvents = totalDelivered + totalRetrying + totalFailed;
  const successRate = totalEvents > 0 ? ((totalDelivered / totalEvents) * 100).toFixed(2) : '100.00';

  return (
    <Card className="bg-white border-border shadow-xs overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base text-foreground font-semibold">
              Event Delivery Throughput
            </CardTitle>
            <Badge variant="success" className="text-[10px] font-mono">
              {successRate}% Success
            </Badge>
          </div>
          <CardDescription className="text-xs pt-0.5">
            Real-time delivery distribution through RabbitMQ AMQP exchange
          </CardDescription>
        </div>

        {/* Range Selector & Legend */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-zinc-950" />
              <span>Delivered</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-amber-400" />
              <span>Retrying</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-red-500" />
              <span>DLQ</span>
            </span>
          </div>

          <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5 text-xs font-mono">
            <button
              onClick={() => onRangeChange('24h')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                range === '24h'
                  ? 'bg-white text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-foreground'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => onRangeChange('7d')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                range === '7d'
                  ? 'bg-white text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-600 hover:text-foreground'
              }`}
            >
              7d
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-4 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-2 py-1 px-3 rounded-xl bg-secondary/30 font-mono text-xs border border-border/50">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">DELIVERED</span>
            <strong className="text-zinc-950 text-sm">{totalDelivered.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">AMQP RETRIES</span>
            <strong className="text-amber-700 text-sm">{totalRetrying.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">DLQ FAILURES</span>
            <strong className="text-red-600 text-sm">{totalFailed.toLocaleString()}</strong>
          </div>
        </div>

        {/* Responsive Interactive SVG Bar Chart */}
        <div className="relative h-48 w-full pt-4">
          <div className="absolute inset-0 flex items-end justify-between gap-1.5 sm:gap-3 px-2">
            {data.map((point, index) => {
              const deliveredPct = (point.delivered / maxVal) * 100;
              const retryingPct = (point.retrying / maxVal) * 100;
              const failedPct = (point.failed / maxVal) * 100;
              const isHovered = hoveredPoint?.timestamp === point.timestamp;

              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-24 z-30 bg-zinc-950 text-white border border-zinc-800 p-2.5 rounded-xl shadow-xl font-mono text-[11px] whitespace-nowrap pointer-events-none animate-fade-in">
                      <div className="text-zinc-400 font-bold border-b border-zinc-800 pb-1 mb-1">
                        {new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {point.total} Total
                      </div>
                      <div className="flex items-center justify-between gap-3 text-emerald-400">
                        <span>Delivered:</span>
                        <strong>{point.delivered}</strong>
                      </div>
                      {point.retrying > 0 && (
                        <div className="flex items-center justify-between gap-3 text-amber-400">
                          <span>Retrying:</span>
                          <strong>{point.retrying}</strong>
                        </div>
                      )}
                      {point.failed > 0 && (
                        <div className="flex items-center justify-between gap-3 text-red-400">
                          <span>In DLQ:</span>
                          <strong>{point.failed}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stacked Bar Container */}
                  <div
                    className={`w-full max-w-[28px] rounded-t-sm flex flex-col justify-end overflow-hidden transition-all duration-200 ${
                      isHovered ? 'ring-2 ring-zinc-950 scale-105 opacity-100' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ height: `${Math.max(deliveredPct + retryingPct + failedPct, 6)}%` }}
                  >
                    {failedPct > 0 && (
                      <div style={{ height: `${failedPct}%` }} className="w-full bg-red-500" />
                    )}
                    {retryingPct > 0 && (
                      <div style={{ height: `${retryingPct}%` }} className="w-full bg-amber-400" />
                    )}
                    <div style={{ height: `${deliveredPct}%` }} className="w-full bg-zinc-950 group-hover:bg-zinc-800" />
                  </div>

                  {/* X-Axis Label */}
                  <span className="text-[10px] font-mono text-muted-foreground mt-2 select-none">
                    {point.timeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
