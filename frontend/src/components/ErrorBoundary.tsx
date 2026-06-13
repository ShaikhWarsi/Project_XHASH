import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw, Terminal, WifiOff, Cpu, ExternalLink } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  componentName?: string
  category?: 'page' | 'widget' | 'chart' | 'data'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

const CATEGORY_STYLES = {
  page: { icon: AlertTriangle, title: 'Page Crashed', height: '60vh' },
  widget: { icon: Terminal, title: 'Widget Error', height: '200px' },
  chart: { icon: Terminal, title: 'Chart Error', height: '300px' },
  data: { icon: Terminal, title: 'Data Error', height: '120px' },
}

const ERROR_TIPS: Record<string, { message: string; suggestion: string }> = {
  'NetworkError': {
    message: 'Cannot connect to the API server.',
    suggestion: 'Make sure the API server is running on port 8000. Run: python scripts/dashboard.py',
  },
  'ERR_CONNECTION_REFUSED': {
    message: 'Connection was refused by the server.',
    suggestion: 'The API server may not be running. Start it with: python scripts/dashboard.py',
  },
  'ERR_NETWORK': {
    message: 'Network error — the server may be down.',
    suggestion: 'Check your internet connection and ensure the API server is running.',
  },
  '500': {
    message: 'The server encountered an internal error.',
    suggestion: 'Check the error message above for details. Try again or restart the API server.',
  },
  '503': {
    message: 'The service is temporarily unavailable.',
    suggestion: 'The server might be starting up or is overloaded. Wait a moment and try again.',
  },
  '429': {
    message: 'Too many requests. Please slow down.',
    suggestion: 'Wait a few seconds before making another request.',
  },
  '404': {
    message: 'The requested page or resource was not found.',
    suggestion: 'The URL may be incorrect or the feature may not be available yet.',
  },
}

function getErrorTip(error: Error | null): { message: string; suggestion: string } | null {
  if (!error) return null
  const msg = error.message || ''
  for (const [key, tip] of Object.entries(ERROR_TIPS)) {
    if (key === '500' && /\b500\b/.test(msg)) return tip
    if (key === '503' && /\b503\b/.test(msg)) return tip
    if (key === '429' && /\b429\b/.test(msg)) return tip
    if (key === '404' && /\b404\b/.test(msg)) return tip
    if (key === 'NetworkError' && /^NetworkError$/i.test(msg)) return tip
    if (key === 'ERR_CONNECTION_REFUSED' && msg === 'ERR_CONNECTION_REFUSED') return tip
    if (key === 'ERR_NETWORK' && msg === 'ERR_NETWORK') return tip
  }
  return null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info })
    console.error(`[ErrorBoundary${this.props.componentName ? `:${this.props.componentName}` : ''}]`, error)
    this.props.onError?.(error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const cat = CATEGORY_STYLES[this.props.category ?? 'widget']
      const Icon = cat.icon
      const tip = getErrorTip(this.state.error)

      return (
        <div
          className="flex items-center justify-center p-6 rounded-lg"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            minHeight: cat.height,
          }}
        >
          <div className="text-center space-y-3 max-w-md">
            <div className="flex items-center justify-center gap-2">
              <Icon className="w-4 h-4 text-down" />
              <span className="text-sm font-semibold text-primary">
                {cat.title}
              </span>
            </div>
            <div className="text-xs font-mono text-muted">
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>

            {tip && (
              <div
                className="text-xs font-mono p-3 rounded-md text-left"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <WifiOff className="w-3 h-3" style={{ color: 'var(--accent-yellow)' }} />
                  <span className="font-semibold" style={{ color: 'var(--accent-yellow)' }}>
                    What happened:
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{tip.message}</p>
                <div className="flex items-center gap-1.5 mb-1">
                  <Cpu className="w-3 h-3" style={{ color: 'var(--accent-cyan)' }} />
                  <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                    How to fix:
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{tip.suggestion}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-medium rounded-sm cursor-pointer border-none"
                style={{ background: 'var(--accent-blue)', color: '#fff' }}
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              {this.props.category === 'page' && (
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono rounded-sm cursor-pointer"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reload Page
                </button>
              )}
              <button
                onClick={() => {
                  if (this.state.error?.stack) {
                    navigator.clipboard.writeText(this.state.error.stack)
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono rounded-sm cursor-pointer"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              >
                Copy Stack
              </button>
              <button
                onClick={() => {
                  const subject = encodeURIComponent(`Error Report: ${this.state.error?.message || 'Unknown error'}`)
                  const body = encodeURIComponent(
                    `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`
                  )
                  window.open(`mailto:support@example.com?subject=${subject}&body=${body}`, '_blank')
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono rounded-sm cursor-pointer"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              >
                <ExternalLink className="w-3 h-3" />
                Report Issue
              </button>
            </div>
            {(import.meta as any).env.DEV && this.state.errorInfo && (
              <details className="mt-2 text-left">
                <summary className="text-[9px] font-mono cursor-pointer text-muted">
                  Stack trace
                </summary>
                <pre
                  className="mt-1 p-2 text-[8px] font-mono overflow-auto max-h-40 rounded-sm"
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
