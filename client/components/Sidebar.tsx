'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Webhook,
  ListChecks,
  Skull,
  Settings,
  Zap,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/events', icon: ListChecks, label: 'Events' },
  { href: '/dlq', icon: Skull, label: 'DLQ' },
  { href: '/endpoints', icon: Webhook, label: 'Endpoints' },
  { href: '/settings', icon: Settings, label: 'API Keys' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 20px 32px' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #a3e635, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(163, 230, 53, 0.4)',
            }}
          >
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Zyvan
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px', flex: 1 }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-glow)' : 'transparent',
                border: `1px solid ${active ? 'rgba(163,230,53,0.25)' : 'transparent'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px 0', borderTop: '1px solid var(--border-subtle)' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Zyvan v1.0.0</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Webhook Reliability Engine</p>
      </div>
    </aside>
  );
}
