import { useToastStore, type ToastType } from '../store/toast'
import { X } from 'lucide-react'

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
    <div className="fixed z-[9999] flex flex-col gap-1" style={{ bottom: 30, right: 10, maxWidth: 360 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade-in flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text-primary)',
          }}
        >
          <span
            className="text-[9px] font-bold tracking-wider"
            style={{ color: COLORS[toast.type] }}
          >
            [{LABELS[toast.type]}]
          </span>
          <span className="flex-1" style={{ lineHeight: 1.4 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 hover:opacity-70"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
