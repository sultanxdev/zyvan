'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient, SystemHealth } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import {
  DashboardSquare01Icon,
  FlashIcon,
  ServerIcon,
  Database01Icon,
  RotateRight01Icon,
  Key01Icon,
  Settings01Icon,
  Alert01Icon,
  Logout01Icon,
  PlayIcon,
  RefreshIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Book01Icon,
} from '@hugeicons/core-free-icons';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: DashboardSquare01Icon, exact: true },
  { href: '/dashboard/events', label: 'Events Ledger', icon: FlashIcon },
  { href: '/dashboard/destinations', label: 'Destinations', icon: ServerIcon },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key01Icon },
  { href: '/dashboard/dlq', label: 'Dead-Letter Queue', icon: Alert01Icon },
  { href: '/dashboard/simulator', label: 'Live Simulator', icon: PlayIcon },
  { href: '/docs', label: 'Documentation', icon: Book01Icon },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings01Icon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, project, logout, isLoading } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const refreshHealth = async () => {
    setCheckingHealth(true);
    try {
      const h = await apiClient.checkHealth();
      setHealth(h);
    } catch {
      // offline
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if not logged in (allow small grace period during initial hydration)
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-black flex items-center justify-center animate-pulse">
            <img src="/logo.png" alt="Zyvan logo" className="size-6 object-contain" />
          </div>
          <span className="font-mono text-sm font-semibold text-zinc-800">Loading Zyvan Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased selection:bg-zinc-950 selection:text-white">
      {/* ─── Desktop Sidebar ───────────────────────────────────── */}
      <aside className="w-64 border-r border-border bg-white/90 backdrop-blur-md flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="flex flex-col">
          {/* Logo Header */}
          <div className="h-16 px-6 border-b border-border/70 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative size-8 rounded-lg overflow-hidden shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center bg-black">
                <img src="/logo.png" alt="Zyvan logo" className="w-full h-full object-cover rounded-md" />
              </div>
              <span className="font-bold text-lg tracking-tight text-foreground lowercase">zyvan</span>
            </Link>
            <Badge variant="pill" className="text-[10px] px-1.5 py-0 font-mono">v0.1</Badge>
          </div>

          {/* Project Switcher Pill */}
          <div className="p-4 border-b border-border/50">
            <div className="p-2.5 rounded-xl border border-zinc-200 bg-secondary/50 flex items-center justify-between">
              <div className="flex flex-col truncate pr-2">
                <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500">Project</span>
                <span className="text-xs font-semibold text-foreground truncate">{project?.name}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 text-white font-mono uppercase shrink-0">
                {project?.plan}
              </span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-zinc-950 text-white shadow-sm font-semibold'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-secondary/70'
                  }`}
                >
                  <Icon icon={item.icon} size={18} className={active ? 'text-[#00DC5A]' : 'text-zinc-500'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Infrastructure Health Widget */}
        <div className="p-4 border-t border-border/60">
          <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-500 text-[11px]">
              <span className="font-semibold uppercase tracking-wider">INFRASTRUCTURE</span>
              <button
                onClick={refreshHealth}
                title="Refresh system status"
                className="hover:text-foreground cursor-pointer"
              >
                <Icon icon={RefreshIcon} size={13} className={checkingHealth ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Services status */}
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-700">
                  <Icon icon={ServerIcon} size={14} className="text-zinc-500" />
                  Express API :4000
                </span>
                <span className={`size-2 rounded-full ${health?.api ? 'bg-[#00DC5A]' : 'bg-amber-400'}`} />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-700">
                  <Icon icon={ServerIcon} size={14} className="text-zinc-500" />
                  RabbitMQ :5672
                </span>
                <span className={`size-2 rounded-full ${health?.rabbitmq ? 'bg-[#00DC5A]' : 'bg-emerald-500'}`} />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-700">
                  <Icon icon={Database01Icon} size={14} className="text-zinc-500" />
                  PostgreSQL :5432
                </span>
                <span className={`size-2 rounded-full ${health?.postgres ? 'bg-[#00DC5A]' : 'bg-emerald-500'}`} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Mobile Home link */}
            <div className="md:hidden flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Zyvan" className="size-7 rounded-md" />
                <span className="font-bold text-base lowercase">zyvan</span>
              </Link>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground">dashboard</Link>
              <span>/</span>
              <span className="text-foreground font-semibold">
                {pathname.split('/')[2] || 'overview'}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <Button variant="glow" size="sm" asChild>
              <Link href="/dashboard/simulator" className="flex items-center gap-1.5 text-xs">
                <Icon icon={PlayIcon} size={14} />
                <span>Dispatch Event</span>
              </Link>
            </Button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl border border-border bg-white hover:bg-secondary transition-colors cursor-pointer"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="size-7 rounded-lg object-cover bg-zinc-100"
                />
                <span className="text-xs font-semibold text-zinc-900 hidden sm:inline pr-1">
                  {user.name}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-white p-2 shadow-xl z-50 animate-fade-in font-sans">
                  <div className="p-2 border-b border-border/70 mb-1">
                    <p className="text-xs font-bold text-zinc-950 truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-zinc-100 font-mono text-zinc-700">
                        {user.provider} auth
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-zinc-700 hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Icon icon={Settings01Icon} size={15} />
                    <span>Project Settings</span>
                  </Link>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Icon icon={Logout01Icon} size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
