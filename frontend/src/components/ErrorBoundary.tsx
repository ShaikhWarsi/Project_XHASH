import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, RotateCcw, Terminal } from 'lucide-react'

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
            <div className="text-xs font-mono">
              <span className="text-muted">
                {this.state.error?.message || 'An unexpected error occurred'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
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
            </div>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
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
