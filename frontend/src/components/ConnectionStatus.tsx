import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react'

interface HealthIssue {
  severity: 'error' | 'warning' | 'info'
  service: string
  title: string
  message: string
  suggestion: string
  docs_url?: string
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'degraded' | 'unhealthy'
  issues: HealthIssue[]
  uptime_seconds: number
}

export default function ConnectionStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const checkHealth = async () => {
    try {
      const { data } = await api.get('/health/detailed', { timeout: 5000 })
      setHealth(data)
    } catch {
      setHealth({
        status: 'unhealthy',
        issues: [{
          severity: 'error',
          service: 'server',
          title: 'Cannot reach API server',
          message: 'The API server is not responding.',
          suggestion: 'Make sure the API server is running on port 8000. Run: python scripts/dashboard.py',
        }],
        uptime_seconds: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1">
        <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>Checking...</span>
      </div>
    )
  }

  if (!health) return null

  const errorCount = health.issues.filter(i => i.severity === 'error').length
  const warningCount = health.issues.filter(i => i.severity === 'warning').length
  const iconColor = health.status === 'healthy'
    ? 'var(--accent-green)'
    : health.status === 'warning'
      ? 'var(--accent-yellow)'
      : 'var(--accent-red)'

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-sm cursor-pointer"
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: 8,
          fontFamily: "'JetBrains Mono', monospace",
        }}
        title={health.status === 'healthy' ? 'All systems operational' : `${errorCount} error(s), ${warningCount} warning(s)`}
      >
        {health.status === 'healthy' ? (
          <Wifi className="w-3 h-3" style={{ color: iconColor }} />
        ) : (
          <AlertTriangle className="w-3 h-3" style={{ color: iconColor }} />
        )}
        <span style={{ color: iconColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {health.status}
        </span>
        {!health.status ? null : (
          <span style={{ color: 'var(--text-muted)', fontSize: 7 }}>
            ({errorCount + warningCount})
          </span>
        )}
      </button>

      {expanded && health.issues.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            width: 360,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 1000,
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            padding: 8,
            marginBottom: 4,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 10 }}>
              System Health
            </span>
            <button
              onClick={checkHealth}
              className="cursor-pointer"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontSize: 8,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Refresh
            </button>
          </div>
          {health.issues.map((issue, i) => {
            const SevIcon = issue.severity === 'error' ? WifiOff : AlertTriangle
            const sevColor = issue.severity === 'error'
              ? 'var(--accent-red)'
              : issue.severity === 'warning'
                ? 'var(--accent-yellow)'
                : 'var(--accent-cyan)'
            return (
              <div
                key={i}
                style={{
                  padding: '6px 8px',
                  marginBottom: 4,
                  background: 'var(--bg-primary)',
                  borderRadius: 4,
                  borderLeft: `2px solid ${sevColor}`,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <SevIcon className="w-3 h-3" style={{ color: sevColor }} />
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {issue.title}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{issue.message}</p>
                <p style={{ color: 'var(--accent-cyan)' }}>
                  Fix: {issue.suggestion}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
