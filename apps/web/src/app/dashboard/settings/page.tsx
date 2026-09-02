'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  Settings01Icon,
  ShieldCheckIcon,
  ServerIcon,
  Database01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';

export default function SettingsPage() {
  const { user, project, switchProject } = useAuth();
  const [projectName, setProjectName] = useState(project?.name || 'Default Production Project');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (project) {
      switchProject({ ...project, name: projectName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title Header */}
      <div className="pb-2 border-b border-border/80">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Project &amp; Environment Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your isolation boundaries, security parameters, and infrastructure connections
        </p>
      </div>

      {/* Project Details */}
      <Card className="bg-white border-border shadow-xs">
        <form onSubmit={handleSave}>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base text-foreground font-semibold">General Information</CardTitle>
            <CardDescription className="text-xs">Your organization and primary webhook tenant namespace</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-800 font-semibold mb-1">PROJECT NAME</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-950 font-sans text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-zinc-500 mb-1">PROJECT ID</label>
                <div className="p-2 rounded-lg bg-secondary text-zinc-700 font-mono text-[11px] truncate">
                  {project?.id}
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1">CURRENT PLAN</label>
                <div className="p-2 rounded-lg bg-secondary text-zinc-900 font-mono text-[11px] font-bold uppercase">
                  {project?.plan} Tier
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-5 pt-3 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {saved && <span className="text-[#00DC5A] flex items-center gap-1 font-mono"><Icon icon={Tick01Icon} size={14} /> Saved successfully</span>}
            </span>
            <Button variant="glow" size="sm" type="submit">
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Infrastructure Connection Checklist */}
      <Card className="bg-white border-border shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base text-foreground font-semibold">Infrastructure Service Connections</CardTitle>
          <CardDescription className="text-xs">
            Core services configured in <code className="font-mono text-zinc-800">.env</code> and <code className="font-mono text-zinc-800">docker-compose.yml</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon icon={Database01Icon} size={18} className="text-zinc-900" />
              <div>
                <strong className="block text-zinc-950">PostgreSQL (Primary Source of Truth)</strong>
                <span className="text-[11px] text-zinc-500">postgresql://zyvan:zyvan_secret@localhost:5432/zyvan_dev</span>
              </div>
            </div>
            <Badge variant="pill" className="text-[10px]">Port 5432</Badge>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon icon={ServerIcon} size={18} className="text-zinc-900" />
              <div>
                <strong className="block text-zinc-950">RabbitMQ (AMQP Message Broker &amp; TTL Dead-Letter)</strong>
                <span className="text-[11px] text-zinc-500">amqp://zyvan:zyvan_secret@localhost:5672 (Management UI :15672)</span>
              </div>
            </div>
            <Badge variant="pill" className="text-[10px]">Port 5672</Badge>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon icon={ShieldCheckIcon} size={18} className="text-[#00DC5A]" />
              <div>
                <strong className="block text-zinc-950">Cryptographic Signing &amp; AES-256 Encryption</strong>
                <span className="text-[11px] text-zinc-500">AES-256-GCM master key + SHA-256 server pepper active</span>
              </div>
            </div>
            <Badge variant="pill" className="text-[10px]">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
