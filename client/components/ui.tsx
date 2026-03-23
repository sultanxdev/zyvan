'use client';

import type { EventStatus } from '@/lib/api';

const STATUS_CONFIG: Record<EventStatus, { label: string; dot: string }> = {
  RECEIVED:        { label: 'Received',        dot: '#60a5fa' },
  DISPATCHING:     { label: 'Dispatching',     dot: '#fbbf24' },
  DELIVERED:       { label: 'Delivered',       dot: '#34d399' },
  RETRY_SCHEDULED: { label: 'Retry Scheduled', dot: '#a78bfa' },
  DEAD_LETTERED:   { label: 'Dead Lettered',   dot: '#f87171' },
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: '#71717a' };
  return (
    <span
      className={`status-${status}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 500,
        border: '1px solid',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      <span
        style={{
          width: 5.5,
          height: 5.5,
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
          boxShadow: `0 0 6px ${cfg.dot}80`,
        }}
      />
      {cfg.label}
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
      <circle cx="12" cy="12" r="10" stroke="var(--border)" strokeWidth="2.5" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        gap: 10,
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}
    >
      <div style={{ opacity: 0.3, marginBottom: 4 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, margin: 0, maxWidth: 280, lineHeight: 1.6 }}>{description}</p>
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
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 28,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.4px',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {subtitle}
          </p>
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
  variant?: 'primary' | 'ghost' | 'danger' | 'accent';
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
    fontSize: size === 'sm' ? 12.5 : 13.5,
    padding: size === 'sm' ? '5px 12px' : '8px 16px',
    fontFamily: 'inherit',
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border)',
    },
    accent: {
      background: 'var(--accent)',
      color: '#000',
      borderColor: 'var(--accent)',
      fontWeight: 600,
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'var(--border)',
    },
    danger: {
      background: 'rgba(239,68,68,0.08)',
      color: '#f87171',
      borderColor: 'rgba(239,68,68,0.2)',
    },
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
      style={{
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = color ? `0 8px 24px ${color}18` : 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top accent bar */}
      {color && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: color,
            borderRadius: '14px 14px 0 0',
          }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {label}
          </p>
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: '6px 0 2px',
              color: color || 'var(--text-primary)',
              letterSpacing: '-0.8px',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0 }}>{sub}</p>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: color ? `${color}12` : 'var(--bg-elevated)',
              border: `1px solid ${color ? `${color}22` : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color || 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  action,
  noPadding,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {title && (
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          {action}
        </div>
      )}
      <div style={noPadding ? {} : { padding: 20 }}>{children}</div>
    </div>
  );
}
