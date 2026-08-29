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
  ExternalLink,
  Github,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/events', icon: ListChecks, label: 'Events' },
  { href: '/dlq', icon: Skull, label: 'Dead Letter Queue' },
  { href: '/endpoints', icon: Webhook, label: 'Endpoints' },
  { href: '/settings', icon: Settings, label: 'API Keys' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        minHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #a3e635, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 18px rgba(163, 230, 53, 0.35)',
              flexShrink: 0,
            }}
          >
            <Zap size={16} color="black" strokeWidth={2.5} />
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'block', letterSpacing: '-0.3px' }}>
              Zyvan
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: -1 }}>
              v1.0.0
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Section Label */}
      <div style={{ padding: '20px 16px 8px' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase', margin: 0 }}>
          Navigation
        </p>
      </div>

      {/* Nav Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', flex: 1 }}>
        {NAV.map(({ href, icon: Icon, label, exact }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-glow)' : 'transparent',
                border: `1px solid ${active ? 'rgba(163,230,53,0.22)' : 'transparent'}`,
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
              {label}
              {active && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '25%',
                  bottom: '25%',
                  width: 3,
                  background: 'var(--accent)',
                  borderRadius: '0 3px 3px 0',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)' }}>
        {/* Quick Links */}
        <div style={{ marginBottom: 12 }}>
          <Link
            href="https://github.com/sultanxdev/zyvan"
            target="_blank"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 12.5,
              color: 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Github size={13} />
            View on GitHub
            <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
          </Link>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 12.5,
              color: 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <ExternalLink size={13} />
            Marketing Site
          </Link>
        </div>

        {/* Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#22c55e',
            flexShrink: 0,
            boxShadow: '0 0 6px rgba(34,197,94,0.6)',
          }} />
          <span style={{ fontSize: 11.5, color: '#4ade80', fontWeight: 500 }}>System Operational</span>
        </div>
      </div>
    </aside>
  );
}
