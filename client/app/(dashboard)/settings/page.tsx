'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type ApiKey } from '@/lib/api';
import { Spinner, PageHeader, EmptyState } from '@/components/ui';
import { KeyRound, Plus, Trash2, Copy, Check, Terminal } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.keys.list();
      setKeys(resp.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await api.keys.create(newKeyName || undefined);
      setNewRawKey((created as ApiKey & { key: string }).key);
      setNewKeyName('');
      await fetchKeys();
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, prefix: string) => {
    if (!confirm(`Revoke API key ${prefix}…? This cannot be undone.`)) return;
    await api.keys.revoke(id);
    await fetchKeys();
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <PageHeader title="API Keys" subtitle="Manage authentication credentials for the Zyvan API" />

      {/* Generate Key */}
      <div className="glass-card animate-fade-in" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <KeyRound size={15} color="var(--accent)" />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Generate New API Key</h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Key name (optional, e.g. production)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="input-base"
            style={{ flex: 1 }}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#000',
              fontWeight: 600, fontSize: 13.5,
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1, fontFamily: 'inherit',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            <Plus size={14} /> {creating ? 'Generating…' : 'Generate Key'}
          </button>
        </div>

        {newRawKey && (
          <div style={{
            marginTop: 16, padding: 16,
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 10
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#34d399', margin: '0 0 10px' }}>
              ✅ Key generated! Copy it now — it will not be shown again.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code className="code-block" style={{ flex: 1, padding: '8px 12px', wordBreak: 'break-all', fontSize: 12 }}>
                {newRawKey}
              </code>
              <button
                onClick={() => copy(newRawKey, 'new')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '8px 14px', borderRadius: 8, flexShrink: 0,
                  border: '1px solid var(--border)',
                  background: copiedId === 'new' ? 'rgba(16,185,129,0.1)' : 'var(--bg-elevated)',
                  color: copiedId === 'new' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {copiedId === 'new' ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === 'new' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keys Table */}
      <div className="glass-card" style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div style={{
          padding: '13px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-surface)',
        }}>
          <KeyRound size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            Active Keys ({keys.length})
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner />
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound size={48} />}
            title="No API keys"
            description="Generate your first key to start using the Zyvan API."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {['Key Prefix', 'Name', 'Created', 'Last Used', 'Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>
                    <code style={{ fontSize: 12.5, color: 'var(--accent-hover)', fontFamily: 'monospace', background: 'var(--accent-glow)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(163,230,53,0.15)' }}>
                      {k.prefix}…
                    </code>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {k.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unnamed</span>}
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {format(new Date(k.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {k.lastUsedAt
                      ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })
                      : <span style={{ fontStyle: 'italic' }}>Never</span>}
                  </td>
                  <td>
                    <button
                      onClick={() => handleRevoke(k.id, k.prefix)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 6,
                        border: '1px solid rgba(239,68,68,0.2)',
                        background: 'var(--danger-bg)', color: '#f87171',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <Trash2 size={12} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Usage Guide */}
      <div className="glass-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Terminal size={15} color="var(--text-muted)" />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>How to use your API key</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>
              Ingest an event
            </p>
            <pre className="code-block">
{`curl -X POST http://localhost:3000/v1/events \\
  -H "x-api-key: zv_live_<your_key>" \\
  -H "Idempotency-Key: unique-event-key" \\
  -H "Content-Type: application/json" \\
  -d '{"endpoint_id":"<uuid>","event_type":"order.created","payload":{}}'`}
            </pre>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>
              Check analytics summary
            </p>
            <pre className="code-block">
{`curl http://localhost:3000/v1/analytics/summary \\
  -H "x-api-key: zv_live_<your_key>"`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
