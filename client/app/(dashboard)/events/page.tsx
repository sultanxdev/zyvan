'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Event, type EventStatus } from '@/lib/api';
import { StatusBadge, Spinner, PageHeader, EmptyState } from '@/components/ui';
import { ListChecks, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'DISPATCHING', label: 'Dispatching' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETRY_SCHEDULED', label: 'Retrying' },
  { value: 'DEAD_LETTERED', label: 'Dead Lettered' },
];

const STATUS_DOT: Record<string, string> = {
  RECEIVED: '#60a5fa',
  DISPATCHING: '#fbbf24',
  DELIVERED: '#34d399',
  RETRY_SCHEDULED: '#a78bfa',
  DEAD_LETTERED: '#f87171',
};

const PAGE_SIZE = 20;

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.events.list({
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEvents(resp.data);
      setTotalCount(resp.count);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const from = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle={`${totalCount.toLocaleString()} total events`}
      />

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        {STATUS_OPTS.map((o) => {
          const active = statusFilter === o.value;
          return (
            <button
              key={o.value}
              onClick={() => setStatusFilter(o.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 20,
                border: '1px solid',
                fontSize: 12.5,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: active ? 'var(--accent-glow)' : 'var(--bg-card)',
                color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
                borderColor: active ? 'rgba(163,230,53,0.3)' : 'var(--border)',
                fontFamily: 'inherit',
              }}
            >
              {o.value && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: STATUS_DOT[o.value],
                  flexShrink: 0,
                }} />
              )}
              {o.label}
            </button>
          );
        })}
        {loading && <Spinner size={16} />}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {!loading && events.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={48} />}
            title="No events found"
            description="Try a different status filter or ingest some events."
          />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  {['Status', 'Event Type', 'Endpoint', 'Retries', 'Event ID', 'Created'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j}>
                            <div className="skeleton" style={{ height: 16, width: j === 0 ? 100 : j === 1 ? 140 : 80 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : events.map((evt) => (
                      <tr key={evt.id}>
                        <td>
                          <StatusBadge status={evt.status as EventStatus} />
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-primary)' }}>
                          {evt.eventType}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {evt.endpointId.slice(0, 8)}…
                        </td>
                        <td>
                          {evt.retryCount > 0 ? (
                            <span style={{
                              fontSize: 12,
                              color: 'var(--warning)',
                              background: 'var(--warning-bg)',
                              padding: '2px 8px',
                              borderRadius: 10,
                              border: '1px solid rgba(245,158,11,0.2)',
                              fontWeight: 500,
                            }}>
                              {evt.retryCount}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/events/${evt.id}`}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: 'var(--accent)',
                              textDecoration: 'none',
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'var(--accent-glow)',
                              border: '1px solid rgba(163,230,53,0.15)',
                            }}
                          >
                            {evt.id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                          {formatDistanceToNow(new Date(evt.createdAt), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                }}
              >
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Showing <strong style={{ color: 'var(--text-secondary)' }}>{from}–{to}</strong> of <strong style={{ color: 'var(--text-secondary)' }}>{totalCount.toLocaleString()}</strong> events
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', borderRadius: 7,
                      border: '1px solid var(--border)', background: 'var(--bg-card)',
                      color: 'var(--text-secondary)', fontSize: 12.5,
                      cursor: page === 0 ? 'not-allowed' : 'pointer',
                      opacity: page === 0 ? 0.4 : 1, fontFamily: 'inherit',
                    }}
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '0 4px' }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= totalCount}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', borderRadius: 7,
                      border: '1px solid var(--border)', background: 'var(--bg-card)',
                      color: 'var(--text-secondary)', fontSize: 12.5,
                      cursor: (page + 1) * PAGE_SIZE >= totalCount ? 'not-allowed' : 'pointer',
                      opacity: (page + 1) * PAGE_SIZE >= totalCount ? 0.4 : 1, fontFamily: 'inherit',
                    }}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
