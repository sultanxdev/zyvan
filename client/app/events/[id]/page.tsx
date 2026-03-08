'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, type Event } from '@/lib/api';
import { StatusBadge, Spinner, Button, PageHeader } from '@/components/ui';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const evt = await api.events.get(id);
      setEvent(evt);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handleReplay = async () => {
    if (!event) return;
    setReplaying(true);
    try {
      await api.events.replay(event.id);
      await fetchEvent();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReplaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ color: '#f87171', padding: 32 }}>
        <p>Error: {error || 'Event not found'}</p>
        <Button onClick={() => router.push('/events')} variant="ghost" style={{ marginTop: 12 }}>
          <ArrowLeft size={14} /> Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Event Detail"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={() => router.push('/events')} variant="ghost" size="sm">
              <ArrowLeft size={14} /> Back
            </Button>
            {event.status === 'DEAD_LETTERED' && (
              <Button onClick={handleReplay} disabled={replaying} size="sm">
                <RefreshCw size={14} className={replaying ? 'animate-spin-slow' : ''} />
                {replaying ? 'Replaying…' : 'Replay Event'}
              </Button>
            )}
          </div>
        }
      />

      <div style={{ display: 'grid', gap: 20 }}>
        {/* Meta card */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <Field label="Status">
              <StatusBadge status={event.status} />
            </Field>
            <Field label="Event Type">
              <code style={{ fontSize: 13, color: 'var(--accent-hover)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4 }}>
                {event.eventType}
              </code>
            </Field>
            <Field label="Event ID">
              <code style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{event.id}</code>
            </Field>
            <Field label="Idempotency Key">
              <code style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{event.idempotencyKey}</code>
            </Field>
            <Field label="Retry Count">
              <span style={{ fontSize: 15, fontWeight: 600, color: event.retryCount > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                {event.retryCount}
              </span>
            </Field>
            <Field label="Created">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {format(new Date(event.createdAt), 'MMM d, yyyy HH:mm:ss')}
              </span>
            </Field>
            {event.failureReason && (
              <Field label="Failure Reason">
                <span style={{ fontSize: 13, color: '#f87171' }}>{event.failureReason}</span>
              </Field>
            )}
            {event.endpoint && (
              <Field label="Endpoint URL">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {event.endpoint.url}
                </span>
              </Field>
            )}
          </div>
        </div>

        {/* Payload */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>Payload</h2>
          <pre
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              fontSize: 13,
              color: '#86efac',
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.6,
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
            }}
          >
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>

        {/* Delivery Attempts */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            Delivery Attempts ({event.attempts?.length ?? 0})
          </h2>

          {!event.attempts || event.attempts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No delivery attempts recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {event.attempts.map((attempt) => {
                const success = attempt.httpStatus !== null && attempt.httpStatus >= 200 && attempt.httpStatus < 300;
                const permFail = attempt.httpStatus !== null && attempt.httpStatus >= 400 && attempt.httpStatus < 500;
                const color = success ? '#10b981' : permFail ? '#ef4444' : '#f59e0b';
                const Icon = success ? CheckCircle2 : permFail ? XCircle : Clock;

                return (
                  <div
                    key={attempt.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '14px 18px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Icon size={16} color={color} />
                      <span style={{ fontSize: 14, fontWeight: 600, color }}>
                        Attempt #{attempt.attemptNumber}
                        {attempt.httpStatus && ` — HTTP ${attempt.httpStatus}`}
                      </span>
                      {attempt.latencyMs && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                          {attempt.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>
                      {format(new Date(attempt.attemptedAt), 'MMM d, yyyy HH:mm:ss')}
                    </p>
                    {attempt.errorMessage && (
                      <p style={{ fontSize: 12, color: '#f87171', margin: '6px 0 0', fontFamily: 'monospace' }}>
                        {attempt.errorMessage}
                      </p>
                    )}
                    {attempt.responseBody && (
                      <pre
                        style={{
                          marginTop: 10,
                          background: 'var(--bg-base)',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          overflowX: 'auto',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {attempt.responseBody}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 6px' }}>
        {label}
      </p>
      {children}
    </div>
  );
}
