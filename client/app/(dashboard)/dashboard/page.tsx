'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type AnalyticsSummary, type Event, type TimeSeriesPoint } from '@/lib/api';
import { StatusBadge, StatCard, Spinner, PageHeader, EmptyState } from '@/components/ui';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  ListChecks,
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
    } catch (e: any) {
      setError(e.message);
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
        subtitle={`Last updated ${formatDistanceToNow(lastRefresh, { addSuffix: true })}`}
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
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10,
            color: '#f87171',
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          ⚠️ {error} — Make sure the API server is running and your API key is set in <code>.env.local</code>.
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Total Events"
              value={summary.total.toLocaleString()}
              color="var(--accent)"
              icon={<Zap size={18} />}
            />
            <StatCard
              label="Delivered"
              value={summary.delivered.toLocaleString()}
              sub={summary.success_rate}
              color="var(--success)"
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              label="Dead Lettered"
              value={summary.dead_lettered.toLocaleString()}
              color="var(--danger)"
              icon={<XCircle size={18} />}
            />
            <StatCard
              label="Retrying"
              value={summary.retrying.toLocaleString()}
              color="var(--retry)"
              icon={<RefreshCw size={18} />}
            />
            <StatCard
              label="Dispatching"
              value={summary.dispatching.toLocaleString()}
              color="var(--warning)"
              icon={<Clock size={18} />}
            />
            <StatCard
              label="Success Rate"
              value={summary.total > 0 ? summary.success_rate : 'N/A'}
              color="var(--success)"
              icon={<TrendingUp size={18} />}
            />
          </div>

          {/* Time-Series Chart */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 20px', color: 'var(--text-primary)' }}>
              7-Day Event Volume
            </h2>
            {chartData.length > 0 && chartData.some((d) => d.total > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 13,
                    }}
                  />
                  <Area type="monotone" dataKey="delivered" stroke="#22c55e" strokeWidth={2} fill="url(#colorDelivered)" name="Delivered" />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fill="url(#colorFailed)" name="Failed" />
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

          {/* Chart + Recent Events */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
            {/* Pie Chart */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 20px', color: 'var(--text-primary)' }}>
                Distribution
              </h2>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={PIE_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontSize: 13,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {pieData.map((d) => (
                      <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: PIE_COLORS[d.key],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{d.name}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<TrendingUp size={40} />}
                  title="No data yet"
                  description="Ingest events to see the distribution"
                />
              )}
            </div>

            {/* Recent Events */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Recent Events
                </h2>
                <Link
                  href="/events"
                  style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
                >
                  View all →
                </Link>
              </div>

              {recentEvents.length === 0 ? (
                <EmptyState
                  icon={<ListChecks size={40} />}
                  title="No events yet"
                  description="Ingest your first event via POST /v1/events"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {recentEvents.map((evt) => (
                    <Link
                      key={evt.id}
                      href={`/events/${evt.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 8,
                        textDecoration: 'none',
                        background: 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <StatusBadge status={evt.status} />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {evt.eventType}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {formatDistanceToNow(new Date(evt.createdAt), { addSuffix: true })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
