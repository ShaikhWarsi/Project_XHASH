import { useToastStore, type ToastType } from '../store/toast'
import { X, RefreshCw } from 'lucide-react'

const COLORS: Record<ToastType, string> = {
  success: 'var(--accent-green)',
  error: 'var(--accent-red)',
  info: 'var(--accent-blue)',
  warning: 'var(--accent-yellow)',
}

const LABELS: Record<ToastType, string> = {
  success: 'OK',
  error: 'ERR',
  info: 'INFO',
  warning: 'WARN',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed z-[9999] flex flex-col gap-1" style={{ bottom: 30, right: 10, maxWidth: 380 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-in"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${COLORS[toast.type]}40`,
            borderLeft: `3px solid ${COLORS[toast.type]}`,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text-primary)',
            padding: '8px 10px',
          }}
        >
          <div className="flex items-start gap-2">
            <span
              className="text-[9px] font-bold tracking-wider shrink-0 mt-0.5"
              style={{ color: COLORS[toast.type] }}
            >
              [{LABELS[toast.type]}]
            </span>
            <div className="flex-1 min-w-0">
              <div style={{ lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{toast.message}</div>
              {toast.suggestion && (
                <div className="mt-1 text-[9px]" style={{ color: 'var(--accent-cyan)', lineHeight: 1.3 }}>
                  {toast.suggestion}
                </div>
              )}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick()
                    removeToast(toast.id)
                  }}
                  className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-sm cursor-pointer border-none text-[9px]"
                  style={{
                    background: 'var(--accent-blue)',
                    color: '#fff',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 hover:opacity-70 shrink-0"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
