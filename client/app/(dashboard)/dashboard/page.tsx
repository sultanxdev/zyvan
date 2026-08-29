'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type AnalyticsSummary, type Event, type TimeSeriesPoint } from '@/lib/api';
import { StatusBadge, StatCard, Spinner, PageHeader, EmptyState, SectionCard } from '@/components/ui';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  ListChecks,
  ArrowRight,
  Webhook,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';

const PIE_COLORS: Record<string, string> = {
  delivered: '#22c55e',
  dead_lettered: '#ef4444',
  retrying: '#a855f7',
  dispatching: '#f59e0b',
  pending: '#3b82f6',
};

const CustomTooltipStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text-primary)',
  fontSize: 12.5,
  boxShadow: 'var(--shadow-md)',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, evts, ts] = await Promise.all([
        api.analytics.summary(),
        api.events.list({ limit: 8 }),
        api.analytics.timeSeries(7),
      ]);
      setSummary(sum);
      setRecentEvents(evts.data);
      setTimeSeries(ts.data);
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  const pieData = summary
    ? [
        { name: 'Delivered', value: summary.delivered, key: 'delivered' },
        { name: 'Dead Lettered', value: summary.dead_lettered, key: 'dead_lettered' },
        { name: 'Retrying', value: summary.retrying, key: 'retrying' },
        { name: 'Dispatching', value: summary.dispatching, key: 'dispatching' },
        { name: 'Pending', value: summary.pending, key: 'pending' },
      ].filter((d) => d.value > 0)
    : [];

  const chartData = timeSeries.map((d) => ({
    ...d,
    date: format(new Date(d.date), 'MMM d'),
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Auto-refreshes every 30s · Last updated ${formatDistanceToNow(lastRefresh, { addSuffix: true })}`}
        action={
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
            Refresh
          </button>
        }
      />

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            color: '#f87171',
            fontSize: 13,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ⚠️ {error} — Ensure the API server is running and your API key is set in <code>.env.local</code>.
        </div>
      )}

      {loading && !summary ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Spinner size={36} />
        </div>
      ) : summary ? (
        <>
          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatCard label="Total Events" value={summary.total.toLocaleString()} color="var(--accent)" icon={<Zap size={17} />} />
            <StatCard label="Delivered" value={summary.delivered.toLocaleString()} sub={summary.success_rate} color="var(--success)" icon={<CheckCircle2 size={17} />} />
            <StatCard label="Dead Lettered" value={summary.dead_lettered.toLocaleString()} color="var(--danger)" icon={<XCircle size={17} />} />
            <StatCard label="Retrying" value={summary.retrying.toLocaleString()} color="var(--retry)" icon={<RefreshCw size={17} />} />
            <StatCard label="Dispatching" value={summary.dispatching.toLocaleString()} color="var(--warning)" icon={<Clock size={17} />} />
            <StatCard label="Success Rate" value={summary.total > 0 ? summary.success_rate : 'N/A'} color="var(--success)" icon={<TrendingUp size={17} />} />
          </div>

          {/* Time-Series Chart */}
          <div style={{ marginBottom: 20 }}>
            <SectionCard title="7-Day Event Volume" noPadding>
              <div style={{ padding: '16px 20px 20px' }}>
                {chartData.length > 0 && chartData.some((d) => d.total > 0) ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={CustomTooltipStyle} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="delivered" stroke="#22c55e" strokeWidth={2} fill="url(#colorDelivered)" name="Delivered" dot={false} />
                      <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fill="url(#colorFailed)" name="Failed" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={<TrendingUp size={40} />}
                    title="No data yet"
                    description="Ingest some events to see the 7-day trend"
                  />
                )}
              </div>
            </SectionCard>
          </div>

          {/* Distribution + Recent Events */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
            {/* Pie Chart */}
            <SectionCard title="Distribution">
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={PIE_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CustomTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                    {pieData.map((d) => (
                      <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 3,
                            background: PIE_COLORS[d.key],
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${PIE_COLORS[d.key]}80`,
                          }}
                        />
                        <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{d.name}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {d.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<TrendingUp size={36} />}
                  title="No data yet"
                  description="Ingest events to see distribution"
                />
              )}
            </SectionCard>

            {/* Recent Events */}
            <SectionCard
              title="Recent Events"
              noPadding
              action={
                <Link href="/events" style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  View all <ArrowRight size={12} />
                </Link>
              }
            >
              {recentEvents.length === 0 ? (
                <div style={{ padding: 20 }}>
                  <EmptyState
                    icon={<ListChecks size={40} />}
                    title="No events yet"
                    description="Ingest your first event via POST /v1/events"
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentEvents.map((evt, idx) => (
                    <Link
                      key={evt.id}
                      href={`/events/${evt.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 20px',
                        textDecoration: 'none',
                        background: 'transparent',
                        transition: 'background 0.1s',
                        borderBottom: idx < recentEvents.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <StatusBadge status={evt.status} />
                      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evt.eventType}
                      </span>
                      {evt.retryCount > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--warning)', background: 'var(--warning-bg)', padding: '1px 7px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>
                          {evt.retryCount} retry
                        </span>
                      )}
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {formatDistanceToNow(new Date(evt.createdAt), { addSuffix: true })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Quick Actions Footer */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Link
              href="/endpoints"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-glow)', border: '1px solid rgba(163,230,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Webhook size={16} color="var(--accent)" />
              </div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Register Endpoint</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Add a new webhook target</p>
              </div>
              <ArrowRight size={15} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </Link>

            <Link
              href="/dlq"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={16} color="var(--danger)" />
              </div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Dead Letter Queue
                  {summary.dead_lettered > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '1px 7px' }}>
                      {summary.dead_lettered}
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {summary.dead_lettered > 0 ? 'Events need attention' : 'No failed events'}
                </p>
              </div>
              <ArrowRight size={15} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
