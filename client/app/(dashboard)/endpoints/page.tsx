'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type Endpoint } from '@/lib/api';
import { Spinner, PageHeader, EmptyState } from '@/components/ui';
import { Webhook, Plus, Trash2, Copy, Check, ToggleLeft, ToggleRight, X, Globe, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchEndpoints = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.endpoints.list(showAll ? false : undefined);
      setEndpoints(resp.data);
    } finally {
      setLoading(false);
    }
  }, [showAll]);

  useEffect(() => { fetchEndpoints(); }, [fetchEndpoints]);

  const handleCreate = async () => {
    if (!newUrl) return;
    setCreating(true);
    setCreateError(null);
    try {
      const ep = await api.endpoints.create({ url: newUrl, name: newName || undefined });
      setNewSecret((ep as Endpoint & { signing_secret: string }).signing_secret);
      setNewUrl('');
      setNewName('');
      await fetchEndpoints();
    } catch (e: unknown) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm(`Deactivate endpoint: ${url}?`)) return;
    await api.endpoints.delete(id);
    await fetchEndpoints();
  };

  const handleToggle = async (ep: Endpoint) => {
    try {
      await api.endpoints.update(ep.id, { is_active: !ep.is_active });
      await fetchEndpoints();
    } catch (e: unknown) { alert((e as Error).message); }
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
        subtitle="Manage webhook target URLs and their delivery configuration"
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
              />
              Show inactive
            </label>
            <button
              onClick={() => { setShowCreate(!showCreate); setNewSecret(null); setCreateError(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                background: showCreate ? 'var(--bg-elevated)' : 'var(--accent)',
                color: showCreate ? 'var(--text-secondary)' : '#000',
                border: `1px solid ${showCreate ? 'var(--border)' : 'var(--accent)'}`,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
            >
              {showCreate ? <X size={14} /> : <Plus size={14} />}
              {showCreate ? 'Cancel' : 'Add Endpoint'}
            </button>
          </div>
        }
      />

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card animate-fade-in" style={{ padding: 22, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Globe size={16} color="var(--accent)" />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Register New Endpoint
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              placeholder="Display name (optional, e.g. Production Payments)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-base"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="url"
                placeholder="https://your-server.com/webhook"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="input-base"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newUrl}
                style={{
                  padding: '9px 20px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#000',
                  fontWeight: 600, fontSize: 13.5, cursor: creating || !newUrl ? 'not-allowed' : 'pointer',
                  opacity: creating || !newUrl ? 0.6 : 1,
                  transition: 'all 0.15s', fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>

          {createError && (
            <p style={{ color: '#f87171', fontSize: 13, marginTop: 10 }}>⚠️ {createError}</p>
          )}

          {newSecret && (
            <div style={{
              marginTop: 16, padding: 16,
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Shield size={14} color="#34d399" />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#34d399', margin: 0 }}>
                  Endpoint created! Save your signing secret — it will not be shown again.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code className="code-block" style={{ flex: 1, padding: '8px 12px', wordBreak: 'break-all', fontSize: 12 }}>
                  {newSecret}
                </code>
                <button
                  onClick={copySecret}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', flexShrink: 0,
                    background: copied ? 'rgba(16,185,129,0.1)' : 'var(--bg-elevated)',
                    color: copied ? '#34d399' : 'var(--text-secondary)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Endpoints Table */}
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
          <table className="data-table">
            <thead>
              <tr>
                {['Name / URL', 'Status', 'Max Retries', 'Timeout', 'Events', 'Created', 'Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => (
                <tr key={ep.id} style={{ opacity: ep.is_active ? 1 : 0.45 }}>
                  <td style={{ maxWidth: 280 }}>
                    {ep.name && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
                        {ep.name}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {ep.url}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {ep.id.slice(0, 12)}…
                    </span>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 500,
                      border: '1px solid',
                      borderColor: ep.is_active ? 'rgba(52,211,153,0.25)' : 'rgba(107,114,128,0.25)',
                      background: ep.is_active ? 'rgba(52,211,153,0.08)' : 'rgba(107,114,128,0.08)',
                      color: ep.is_active ? '#34d399' : '#6b7280',
                    }}>
                      <span style={{ width: 5.5, height: 5.5, borderRadius: '50%', background: 'currentColor', boxShadow: ep.is_active ? '0 0 6px rgba(52,211,153,0.6)' : 'none' }} />
                      {ep.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ep.max_retries}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{(ep.timeout_ms / 1000).toFixed(0)}s</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{ep.event_count.toLocaleString()}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(ep.created_at), { addSuffix: true })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleToggle(ep)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6,
                          border: '1px solid var(--border)', background: 'transparent',
                          color: ep.is_active ? 'var(--text-secondary)' : '#34d399',
                          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {ep.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        {ep.is_active ? 'Disable' : 'Enable'}
                      </button>
                      {ep.is_active && (
                        <button
                          onClick={() => handleDelete(ep.id, ep.url)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 6,
                            border: '1px solid rgba(239,68,68,0.2)',
                            background: 'var(--danger-bg)', color: '#f87171',
                            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          <Trash2 size={12} /> Deactivate
                        </button>
                      )}
                    </div>
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
