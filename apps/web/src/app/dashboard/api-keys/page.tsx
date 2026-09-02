'use client';

import React, { useState, useEffect } from 'react';
import { apiClient, WebhookApiKey } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  Key01Icon,
  PlusSignIcon,
  RefreshIcon,
  CopyIcon,
  Tick01Icon,
  Cancel01Icon,
  ShieldCheckIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<WebhookApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['events:write', 'events:read']);
  const [submitting, setSubmitting] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getApiKeys();
      setKeys(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try {
      const result = await apiClient.createApiKey({ name, scopes });
      setNewlyCreatedKey(result.rawKey);
      setName('');
      await fetchKeys();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Applications using it will be rejected.')) {
      return;
    }
    await apiClient.revokeApiKey(id);
    await fetchKeys();
  };

  const copySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            API Keys
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Machine-to-machine bearer tokens used to ingest events and query delivery statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchKeys}
            className="text-xs bg-white h-9"
          >
            <Icon icon={RefreshIcon} size={14} className={loading ? 'animate-spin' : ''} />
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => {
              setNewlyCreatedKey(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs h-9"
          >
            <Icon icon={PlusSignIcon} size={15} />
            <span>Generate API Key</span>
          </Button>
        </div>
      </div>

      {/* Keys Table Card */}
      <Card className="bg-white border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-secondary/40 border-b border-border text-zinc-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Key Name</th>
                  <th className="py-3 px-4">Key Identifier</th>
                  <th className="py-3 px-4">Granted Scopes</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-zinc-950 font-sans text-sm">
                      {k.name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-800">
                      <span className="px-2 py-0.5 rounded bg-secondary text-zinc-700">
                        {k.keyPrefix}••••••••
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((sc) => (
                          <span key={sc} className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-800">
                            {sc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                        title="Revoke API key"
                      >
                        <Icon icon={Delete02Icon} size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Modal: Generate New API Key ──────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Generate New API Key</h3>
                <p className="text-xs text-muted-foreground">Tokens are hashed with a server-side pepper at rest</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="size-8 rounded-lg border border-border flex items-center justify-center text-zinc-500 hover:text-foreground cursor-pointer"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            {newlyCreatedKey ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                  <strong className="block font-bold">Key Generated Successfully!</strong>
                  <p className="text-[11px]">Copy this key now. It will never be displayed again.</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 text-zinc-100 flex items-center justify-between">
                  <span className="truncate pr-2">{newlyCreatedKey}</span>
                  <button
                    onClick={() => copySecret(newlyCreatedKey)}
                    className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer shrink-0"
                    title="Copy API key"
                  >
                    <Icon icon={copiedKey ? Tick01Icon : CopyIcon} size={14} className={copiedKey ? 'text-[#00DC5A]' : ''} />
                  </button>
                </div>

                <Button
                  className="w-full bg-zinc-950 text-white hover:bg-zinc-800"
                  onClick={() => setModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-zinc-800 font-semibold mb-1">KEY NAME</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ingestion Pipeline Worker"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 font-sans text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-800 font-semibold mb-1">SCOPES</label>
                  <div className="space-y-1.5 pt-1">
                    {[
                      { id: 'events:write', label: 'events:write (Ingest events into pipeline)' },
                      { id: 'events:read', label: 'events:read (Query delivery logs)' },
                      { id: 'destinations:manage', label: 'destinations:manage (Register & update endpoints)' },
                    ].map((sc) => {
                      const selected = scopes.includes(sc.id);
                      return (
                        <label
                          key={sc.id}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              if (selected) {
                                setScopes(scopes.filter((s) => s !== sc.id));
                              } else {
                                setScopes([...scopes, sc.id]);
                              }
                            }}
                            className="size-3.5 accent-zinc-950"
                          />
                          <span className="text-zinc-800 text-[11px] font-mono">{sc.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="glow" size="sm" type="submit" disabled={submitting}>
                    {submitting ? 'Generating...' : 'Create Key'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
