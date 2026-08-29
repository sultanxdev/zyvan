'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Event } from '@/lib/api';
import { StatusBadge, Spinner, PageHeader, EmptyState } from '@/components/ui';
import { RefreshCw, AlertTriangle, CheckCheck } from 'lucide-react';
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

  useEffect(() => { fetchDLQ(); }, [fetchDLQ]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setReplaying(false);
    }
  };

  const handleSingleReplay = async (id: string) => {
    try {
      await api.events.replay(id);
      await fetchDLQ();
    } catch (e: unknown) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Dead Letter Queue"
        subtitle={`${totalCount} event${totalCount !== 1 ? 's' : ''} failed permanently and need attention`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={fetchDLQ}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
              Refresh
            </button>
            {selected.size > 0 && (
              <button
                onClick={handleBulkReplay}
                disabled={replaying}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#000',
                  fontSize: 13, fontWeight: 600,
                  cursor: replaying ? 'not-allowed' : 'pointer',
                  opacity: replaying ? 0.7 : 1, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                <RefreshCw size={13} className={replaying ? 'animate-spin-slow' : ''} />
                Replay {selected.size} Selected
              </button>
            )}
          </div>
        }
      />

      {/* Alert Banner (when events exist) */}
      {!loading && totalCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10, marginBottom: 18,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <AlertTriangle size={16} color="#f87171" />
          <span style={{ fontSize: 13, color: '#f87171' }}>
            <strong>{totalCount}</strong> event{totalCount !== 1 ? 's' : ''} permanently failed after exhausting all retries. Review and replay them below.
          </span>
        </div>
      )}

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<CheckCheck size={48} />}
            title="DLQ is empty 🎉"
            description="No dead-lettered events. Your delivery pipeline is healthy!"
          />
        ) : (
          <>
            {/* Bulk Controls */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <input
                type="checkbox"
                checked={selected.size === events.length && events.length > 0}
                onChange={selected.size === events.length ? clearAll : selectAll}
                style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                {selected.size > 0 ? `${selected.size} selected` : 'Select to bulk replay'}
              </span>
              {selected.size > 0 && (
                <button
                  onClick={clearAll}
                  style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Clear selection
                </button>
              )}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  {['', 'Status', 'Event Type', 'Failure Reason', 'Retries', 'Failed', 'Actions'].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ background: selected.has(evt.id) ? 'rgba(239,68,68,0.04)' : 'transparent' }}
                  >
                    <td style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(evt.id)}
                        onChange={() => toggleSelect(evt.id)}
                        style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>
                    <td><StatusBadge status={evt.status} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-primary)' }}>
                      {evt.eventType}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <span style={{
                        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', fontSize: 12.5, color: '#f87171',
                        fontFamily: 'monospace', background: 'rgba(248,113,113,0.05)',
                        padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.1)',
                      }}>
                        {evt.failureReason || 'Unknown error'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12, color: 'var(--danger)', fontWeight: 600,
                        background: 'var(--danger-bg)', padding: '2px 8px', borderRadius: 10,
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}>
                        {evt.retryCount}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(evt.updatedAt), { addSuffix: true })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleSingleReplay(evt.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid rgba(163,230,53,0.25)',
                            background: 'var(--accent-glow)', color: 'var(--accent-hover)',
                            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 0.15s',
                          }}
                        >
                          <RefreshCw size={11} /> Replay
                        </button>
                        <Link
                          href={`/events/${evt.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none',
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
