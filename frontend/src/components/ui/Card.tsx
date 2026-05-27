import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  variant?: 'default' | 'flat' | 'highlight'
  actions?: ReactNode
  padding?: 'normal' | 'compact' | 'none'
  hoverable?: boolean
}

export default function Card({
  title,
  children,
  className = '',
  variant = 'default',
  actions,
  padding = 'normal',
  hoverable = false,
}: CardProps) {
  const borderColor =
    variant === 'highlight' ? 'var(--accent-cyan)' : 'var(--border-color)'
  const paddingMap = { normal: '6px 8px', compact: '4px 6px', none: '0' }
  const shadow = variant === 'highlight' ? 'var(--glow-blue)' : 'var(--widget-shadow)'

  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: variant === 'highlight'
          ? '1px solid var(--border-color)'
          : `1px solid ${borderColor}`,
        borderTop: `2px solid ${borderColor}`,
        borderRadius: 'var(--card-radius)',
        boxShadow: shadow,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.boxShadow = 'var(--widget-shadow-hover)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.boxShadow = shadow
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {title && (
        <div
          style={{
            padding: title || actions ? '8px 12px' : 0,
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            {title}
          </h3>
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{actions}</div>
          )}
        </div>
      )}
      <div
        style={{
          padding: title ? paddingMap[padding] : paddingMap[padding],
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function CardGrid({ children, cols = 2, gap = 6 }: { children: ReactNode; cols?: number; gap?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  )
}

export function CardRow({ children, gap = 6 }: { children: ReactNode; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>
  )
}

export function CardSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
