'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Event, type EventStatus } from '@/lib/api';
import { StatusBadge, Spinner, PageHeader, EmptyState } from '@/components/ui';
import { ListChecks, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'DISPATCHING', label: 'Dispatching' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETRY_SCHEDULED', label: 'Retry Scheduled' },
  { value: 'DEAD_LETTERED', label: 'Dead Lettered' },
];

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

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  return (
    <div>
      <PageHeader title="Events" subtitle={`${totalCount} total events`} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {STATUS_OPTS.map((o) => (
          <button
            key={o.value}
            onClick={() => setStatusFilter(o.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: statusFilter === o.value ? 'var(--accent)' : 'var(--bg-card)',
              color: statusFilter === o.value ? 'white' : 'var(--text-secondary)',
              borderColor: statusFilter === o.value ? 'var(--accent)' : 'var(--border)',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={48} />}
            title="No events found"
            description="Try a different status filter or ingest some events."
          />
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Status', 'Event Type', 'Event ID', 'Retries', 'Created'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.1s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={evt.status as EventStatus} />
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)' }}>
                      {evt.eventType}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/events/${evt.id}`}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: 'var(--accent)',
                          textDecoration: 'none',
                        }}
                      >
                        {evt.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {evt.retryCount}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(evt.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    opacity: page === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: (page + 1) * PAGE_SIZE >= totalCount ? 'not-allowed' : 'pointer',
                    opacity: (page + 1) * PAGE_SIZE >= totalCount ? 0.4 : 1,
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
