'use client';

import type { EventStatus } from '@/lib/api';

const STATUS_LABELS: Record<EventStatus, string> = {
  RECEIVED: 'Received',
  DISPATCHING: 'Dispatching',
  DELIVERED: 'Delivered',
  RETRY_SCHEDULED: 'Retry Scheduled',
  DEAD_LETTERED: 'Dead Lettered',
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`status-${status}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        border: '1px solid',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin-slow"
      style={{ display: 'inline-block' }}
    >
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        gap: 12,
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}
    >
      <div style={{ opacity: 0.4, marginBottom: 4 }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>{title}</p>
      <p style={{ fontSize: 14, margin: 0 }}>{description}</p>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style: extraStyle,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    fontWeight: 500,
    border: '1px solid',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    fontSize: size === 'sm' ? 13 : 14,
    padding: size === 'sm' ? '5px 12px' : '8px 16px',
  };

  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'white',
      borderColor: 'var(--accent)',
    } as React.CSSProperties,
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'var(--border)',
    } as React.CSSProperties,
    danger: {
      background: 'rgba(239,68,68,0.1)',
      color: '#f87171',
      borderColor: 'rgba(239,68,68,0.25)',
    } as React.CSSProperties,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...extraStyle }}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="glass-card animate-fade-in"
      style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}
    >
      {color && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: color,
            borderRadius: '12px 12px 0 0',
          }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{label}</p>
          <p
            style={{
              fontSize: 30,
              fontWeight: 700,
              margin: '6px 0 4px',
              color: color || 'var(--text-primary)',
              letterSpacing: '-1px',
              lineHeight: 1,
            }}
          >
            {value}
          </p>
          {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{sub}</p>}
        </div>
        {icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: color ? `${color}18` : 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color || 'var(--text-muted)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
