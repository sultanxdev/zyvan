'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Endpoint } from '@/lib/api';
import { Spinner, Button, PageHeader, EmptyState } from '@/components/ui';
import { Webhook, Plus, Trash2, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.endpoints.list();
      setEndpoints(resp.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const handleCreate = async () => {
    if (!newUrl) return;
    setCreating(true);
    setCreateError(null);
    try {
      const ep = await api.endpoints.create({ url: newUrl });
      setNewSecret((ep as any).signing_secret);
      setNewUrl('');
      await fetchEndpoints();
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm(`Deactivate endpoint: ${url}?`)) return;
    await api.endpoints.delete(id);
    await fetchEndpoints();
  };

  const copySecret = () => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <PageHeader
        title="Endpoints"
        subtitle="Manage webhook target URLs"
        action={
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus size={14} /> Add Endpoint
          </Button>
        }
      />

      {/* Create form */}
      {showCreate && (
        <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            Register New Endpoint
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="url"
              placeholder="https://your-server.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
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
            <Button onClick={handleCreate} disabled={creating || !newUrl}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
          {createError && (
            <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>⚠️ {createError}</p>
          )}

          {/* Show signing secret once */}
          {newSecret && (
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
                ✅ Endpoint created! Save your signing secret — it will not be shown again.
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
                  }}
                >
                  {newSecret}
                </code>
                <button
                  onClick={copySecret}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: copied ? 'rgba(16,185,129,0.1)' : 'var(--bg-elevated)',
                    color: copied ? '#34d399' : 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Endpoints list */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spinner />
          </div>
        ) : endpoints.length === 0 ? (
          <EmptyState
            icon={<Webhook size={48} />}
            title="No endpoints yet"
            description="Register a webhook endpoint to start receiving events."
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['URL', 'Max Retries', 'Timeout', 'Events', 'Created', 'Actions'].map((h) => (
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
              {endpoints.map((ep) => (
                <tr
                  key={ep.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td style={{ padding: '14px 16px', maxWidth: 280 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {ep.url}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {ep.id.slice(0, 8)}…
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {ep.max_retries}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {(ep.timeout_ms / 1000).toFixed(0)}s
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {ep.event_count}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(ep.created_at), { addSuffix: true })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(ep.id, ep.url)}
                    >
                      <Trash2 size={12} /> Deactivate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
