import type { ReactNode } from 'react'
import { PackageOpen } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

export default function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '16px 0' : '32px 0',
        gap: compact ? 6 : 8,
      }}
    >
      <div style={{ opacity: 0.3 }}>
        {icon || <PackageOpen size={compact ? 20 : 28} />}
      </div>
      <div
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            textAlign: 'center',
            maxWidth: 280,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: compact ? 4 : 8 }}>{action}</div>}
    </div>
  )
}
