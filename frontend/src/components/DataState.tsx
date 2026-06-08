import { ReactNode } from 'react'
import Skeleton from './Skeleton'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface DataStateProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  emptyAction?: ReactNode
  onRetry?: () => void
  children: ReactNode
  skeleton?: ReactNode
}

export default function DataState({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'No data available',
  emptyAction,
  onRetry,
  children,
  skeleton,
}: DataStateProps) {
  if (loading) {
    return skeleton || (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton width={200} height={16} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Skeleton height={64} variant="rect" />
          <Skeleton height={64} variant="rect" />
          <Skeleton height={64} variant="rect" />
          <Skeleton height={64} variant="rect" />
        </div>
        <Skeleton height={200} variant="rect" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <Skeleton height={120} variant="rect" />
          <Skeleton height={120} variant="rect" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        minHeight: 200, color: 'var(--text-muted)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <AlertTriangle size={24} style={{ color: '#ef4444' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
          Error loading data
        </div>
        <div style={{ fontSize: 10, textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>
          {error}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 10, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              background: 'var(--bg-hover)', color: 'var(--text-primary)',
              border: '1px solid var(--border-color)', borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}
      </div>
    )
  }

  if (empty) {
    return (
      <div style={{
        padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        minHeight: 150, color: 'var(--text-muted)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ fontSize: 12 }}>{emptyMessage}</div>
        {emptyAction}
      </div>
    )
  }

  return <>{children}</>
}