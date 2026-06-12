import { useEffect, useState } from 'react'
import { AlertTriangle, X, WifiOff, Cpu, ExternalLink } from 'lucide-react'
import { api } from '../api/client'

const DISMISS_KEY = 'startup_errors_dismissed'

interface Issue {
  severity: string
  service: string
  title: string
  message: string
  suggestion: string
}

export default function StartupDiagnostic() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const dismissedBefore = localStorage.getItem(DISMISS_KEY)
    if (dismissedBefore) {
      const parsed = JSON.parse(dismissedBefore)
      if (Date.now() - parsed < 86400000) {
        setDismissed(true)
        return
      }
    }

    api.get('/health/detailed', { timeout: 5000 })
      .then(({ data }) => {
        if (data.issues && data.issues.length > 0) {
          const critical = data.issues.filter((i: Issue) => i.severity === 'error')
          if (critical.length > 0) {
            setIssues(critical)
            setDismissed(false)
          }
        }
      })
      .catch(() => {
        setIssues([{
          severity: 'error',
          service: 'server',
          title: 'API Server Not Running',
          message: 'Could not connect to the API server.',
          suggestion: 'Open a terminal and run: python scripts/dashboard.py',
        }])
        setDismissed(false)
      })
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(Date.now()))
    setDismissed(true)
  }

  if (dismissed || issues.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-sm"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--accent-red)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent-red)' }} />
            <span className="text-[10px] font-semibold font-mono" style={{ color: 'var(--accent-red)' }}>
              Startup Issues Detected
            </span>
          </div>
          <button
            onClick={dismiss}
            className="cursor-pointer"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 2 }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {issues.map((issue, i) => (
          <div
            key={i}
            className="mb-2 last:mb-0 p-2 rounded-md"
            style={{ background: 'var(--bg-primary)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <WifiOff className="w-3 h-3" style={{ color: 'var(--accent-red)' }} />
              <span className="text-[10px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                {issue.title}
              </span>
            </div>
            <p className="text-[9px] font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
              {issue.message}
            </p>
            <p className="text-[9px] font-mono" style={{ color: 'var(--accent-cyan)' }}>
              Fix: {issue.suggestion}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
