'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type AnalyticsSummary, type Event } from '@/lib/api';
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const PIE_COLORS: Record<string, string> = {
  delivered: '#10b981',
  dead_lettered: '#ef4444',
  retrying: '#8b5cf6',
  dispatching: '#f59e0b',
  pending: '#3b82f6',
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, evts] = await Promise.all([
        api.analytics.summary(),
        api.events.list({ limit: 8 }),
      ]);
      setSummary(sum);
      setRecentEvents(evts.data);
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
          ⚠️ {error} — Make sure the API server is running.
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Total Events"
              value={summary.total.toLocaleString()}
              color="#6366f1"
              icon={<Zap size={18} />}
            />
            <StatCard
              label="Delivered"
              value={summary.delivered.toLocaleString()}
              sub={summary.success_rate}
              color="#10b981"
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              label="Dead Lettered"
              value={summary.dead_lettered.toLocaleString()}
              color="#ef4444"
              icon={<XCircle size={18} />}
            />
            <StatCard
              label="Retrying"
              value={summary.retrying.toLocaleString()}
              color="#8b5cf6"
              icon={<RefreshCw size={18} />}
            />
            <StatCard
              label="Dispatching"
              value={summary.dispatching.toLocaleString()}
              color="#f59e0b"
              icon={<Clock size={18} />}
            />
            <StatCard
              label="Success Rate"
              value={summary.total > 0 ? summary.success_rate : 'N/A'}
              color="#10b981"
              icon={<TrendingUp size={18} />}
            />
          </div>

          {/* Chart + Recent Events */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
            {/* Pie Chart */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 20px', color: 'var(--text-primary)' }}>
                Event Distribution
              </h2>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
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
                  description="Ingest some events to see the distribution"
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
