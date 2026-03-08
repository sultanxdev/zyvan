'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type ApiKey } from '@/lib/api';
import { Spinner, Button, PageHeader, EmptyState } from '@/components/ui';
import { KeyRound, Plus, Trash2, Copy, Check } from 'lucide-react';
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

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await api.keys.create(newKeyName || undefined);
      setNewRawKey((created as any).key);
      setNewKeyName('');
      await fetchKeys();
    } catch (e: any) {
      alert(e.message);
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
      <PageHeader title="API Keys" subtitle="Manage authentication keys for the Zyvan API" />

      {/* Create new key */}
      <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>
          Generate New API Key
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Key name (optional, e.g. production)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <Button onClick={handleCreate} disabled={creating}>
            <Plus size={14} /> {creating ? 'Creating…' : 'Generate Key'}
          </Button>
        </div>

        {/* Show raw key once */}
        {newRawKey && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 8,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: '#34d399', margin: '0 0 8px' }}>
              ✅ Key generated! Copy it now — it will not be shown again.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <code
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  background: 'var(--bg-base)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  wordBreak: 'break-all',
                  fontFamily: "'Fira Code', monospace",
                }}
              >
                {newRawKey}
              </code>
              <button
                onClick={() => copy(newRawKey, 'new')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: copiedId === 'new' ? 'rgba(16,185,129,0.1)' : 'var(--bg-elevated)',
                  color: copiedId === 'new' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: 13,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {copiedId === 'new' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'new' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keys table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <KeyRound size={16} color="var(--text-muted)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
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
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Prefix', 'Name', 'Created', 'Last Used', 'Actions'].map((h) => (
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
              {keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <code style={{ fontSize: 13, color: 'var(--accent-hover)', fontFamily: 'monospace' }}>
                      {k.prefix}…
                    </code>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {k.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {format(new Date(k.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {k.lastUsedAt
                      ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })
                      : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Never</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevoke(k.id, k.prefix)}
                    >
                      <Trash2 size={12} /> Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Usage hint */}
      <div
        style={{
          marginTop: 20,
          padding: 18,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
          How to use your API key
        </p>
        <pre
          style={{
            fontSize: 12,
            color: '#86efac',
            background: 'var(--bg-base)',
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            margin: 0,
            overflowX: 'auto',
          }}
        >
{`curl -X POST http://localhost:3000/v1/events \\
  -H "x-api-key: zv_live_<your_key>" \\
  -H "Idempotency-Key: unique-event-key" \\
  -H "Content-Type: application/json" \\
  -d '{"endpoint_id":"<uuid>","event_type":"order.created","payload":{}}'`}
        </pre>
      </div>
    </div>
  );
}
