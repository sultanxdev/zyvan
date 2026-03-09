'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Event } from '@/lib/api';
import { StatusBadge, Spinner, Button, PageHeader, EmptyState } from '@/components/ui';
import { Skull, RefreshCw, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function DLQPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [replaying, setReplaying] = useState(false);

  const fetchDLQ = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.events.list({ status: 'DEAD_LETTERED', limit: 50 });
      setEvents(resp.data);
      setTotalCount(resp.count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDLQ();
  }, [fetchDLQ]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(events.map((e) => e.id)));
  const clearAll = () => setSelected(new Set());

  const handleBulkReplay = async () => {
    if (selected.size === 0) return;
    setReplaying(true);
    try {
      const result = await api.events.replayBulk([...selected]);
      setSelected(new Set());
      await fetchDLQ();
      if (result.failed.length > 0) {
        alert(`Replayed ${result.replayed.length}, failed: ${result.failed.length}`);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReplaying(false);
    }
  };

  const handleSingleReplay = async (id: string) => {
    try {
      await api.events.replay(id);
      await fetchDLQ();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Dead Letter Queue"
        subtitle={`${totalCount} events failed permanently`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            {selected.size > 0 && (
              <Button onClick={handleBulkReplay} disabled={replaying}>
                <RefreshCw size={14} className={replaying ? 'animate-spin-slow' : ''} />
                Replay {selected.size} Selected
              </Button>
            )}
          </div>
        }
      />

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<Skull size={48} />}
            title="DLQ is empty"
            description="No dead-lettered events. Great job!"
          />
        ) : (
          <>
            {/* Bulk controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
              }}
            >
              <input
                type="checkbox"
                checked={selected.size === events.length && events.length > 0}
                onChange={selected.size === events.length ? clearAll : selectAll}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </span>
              {selected.size > 0 && (
                <button
                  onClick={clearAll}
                  style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Clear
                </button>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['', 'Status', 'Event Type', 'Failure Reason', 'Retries', 'Failed', 'Actions'].map((h, i) => (
                    <th
                      key={i}
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
                      background: selected.has(evt.id) ? 'rgba(99,102,241,0.05)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '12px 16px', width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(evt.id)}
                        onChange={() => toggleSelect(evt.id)}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={evt.status} />
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)' }}>
                      {evt.eventType}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#f87171', maxWidth: 240 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evt.failureReason || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {evt.retryCount}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(evt.updatedAt), { addSuffix: true })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleSingleReplay(evt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <RefreshCw size={12} /> Replay
                        </button>
                        <Link
                          href={`/events/${evt.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            fontSize: 12,
                            textDecoration: 'none',
                          }}
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
