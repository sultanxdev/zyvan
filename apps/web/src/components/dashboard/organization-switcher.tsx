'use client';

import React, { useState } from 'react';
import { useAuth, OrganizationInfo } from '@/lib/auth-context';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building01Icon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  PlusSignIcon,
  Cancel01Icon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons';

export function OrganizationSwitcher() {
  const { organization, organizations, switchOrganization, createOrganization } = useAuth();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setNewOrgName(val);
    setNewOrgSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    );
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newOrgSlug) return;
    setSubmitting(true);
    setError(null);
    try {
      await createOrganization(newOrgName, newOrgSlug);
      setNewOrgName('');
      setNewOrgSlug('');
      setModalOpen(false);
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const roleColor = (role?: string) => {
    switch (role?.toUpperCase()) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MEMBER':
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
      case 'VIEWER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full p-2.5 rounded-xl border border-zinc-200 bg-secondary/50 hover:bg-secondary flex items-center justify-between transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
            <div className="size-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Icon icon={Building01Icon} size={15} />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500 tracking-wider">
                Organization
              </span>
              <span className="text-xs font-bold text-foreground truncate">
                {organization?.name || 'Default Org'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {organization?.role && (
              <span
                className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${roleColor(
                  organization.role
                )}`}
              >
                {organization.role}
              </span>
            )}
            <Icon
              icon={ArrowDown01Icon}
              size={13}
              className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {open && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl border border-border bg-white p-2 shadow-2xl z-50 animate-fade-in font-mono">
            <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Switch Organization</span>
              <span className="text-[9px]">{organizations.length} available</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 py-1">
              {organizations.map((org) => {
                const isSelected = org.id === organization?.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-950 text-white'
                        : 'hover:bg-secondary text-zinc-800'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-semibold truncate">{org.name}</span>
                      <span
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-zinc-400' : 'text-muted-foreground'
                        }`}
                      >
                        {org.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {org.role && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                            isSelected
                              ? 'bg-zinc-800 text-zinc-200'
                              : roleColor(org.role)
                          }`}
                        >
                          {org.role}
                        </span>
                      )}
                      {isSelected && (
                        <Icon icon={CheckmarkCircle02Icon} size={14} className="text-[#00DC5A]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/70 mt-1">
              <button
                onClick={() => {
                  setOpen(false);
                  setModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-zinc-300 hover:border-zinc-950 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-all cursor-pointer"
              >
                <Icon icon={PlusSignIcon} size={14} />
                <span>Create Organization</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Organization Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-mono">
          <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
                  <Icon icon={Building01Icon} size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">New Organization</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Create a multi-tenant boundary for your event streams
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-secondary cursor-pointer"
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-800 mb-1.5 uppercase">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Payments Inc"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1.5 uppercase">
                  Organization Slug
                </label>
                <input
                  type="text"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  placeholder="acme-payments"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  required
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Used in API paths and tenant-scoped webhooks.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/60 border border-border text-[11px] text-zinc-600 flex items-start gap-2">
                <Icon icon={SecurityCheckIcon} size={16} className="text-[#00DC5A] shrink-0 mt-0.5" />
                <span>
                  You will automatically become the <strong>OWNER</strong> of this organization with full RBAC
                  permissions over projects, destinations, and event retention.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !newOrgName}
                  className="bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  {submitting ? 'Creating...' : 'Create Organization'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
