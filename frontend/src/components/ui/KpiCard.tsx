import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string
  change?: { value: string; up: boolean }
  icon?: ReactNode
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

export default function KpiCard({ label, value, change, icon, subtitle, trend }: KpiCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--card-radius)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        {icon && <span style={{ opacity: 0.4, width: 14, height: 14 }}>{icon}</span>}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: trend === 'up' ? 'var(--accent-green)' : trend === 'down' ? 'var(--accent-red)' : 'var(--text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {change && (
          <span
            style={{
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color: change.up ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          >
            {change.up ? '+' : ''}{change.value}
          </span>
        )}
        {subtitle && (
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
