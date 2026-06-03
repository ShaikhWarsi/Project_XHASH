import { useState, useEffect, useCallback } from 'react'
import { Info, AlertTriangle, AlertOctagon, X } from 'lucide-react'

interface MotdMessage {
  id: string
  message: string
  type: 'info' | 'warning' | 'important'
  timestamp: number
}

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: typeof Info; color: string }> = {
  info: { bg: 'rgba(0, 229, 255, 0.08)', border: 'rgba(0, 229, 255, 0.25)', icon: Info, color: 'var(--accent-blue)' },
  warning: { bg: 'rgba(255, 183, 77, 0.08)', border: 'rgba(255, 183, 77, 0.25)', icon: AlertTriangle, color: 'var(--accent-yellow)' },
  important: { bg: 'rgba(255, 82, 82, 0.08)', border: 'rgba(255, 82, 82, 0.25)', icon: AlertOctagon, color: 'var(--accent-red)' },
}

const DISMISSED_KEY = 'motd_dismissed'

function getDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}') }
  catch { return {} }
}

function setDismissed(id: string) {
  const map = getDismissed()
  map[id] = Date.now()
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(map))
}

export default function MotdBanner() {
  const [motd, setMotd] = useState<MotdMessage | null>(null)
  const [dismissed, setDismissedState] = useState<Record<string, number>>(getDismissed)

  const fetchMotd = useCallback(async () => {
    try {
      const res = await fetch('/api/motd')
      if (res.ok) {
        const data = await res.json()
        setMotd(data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchMotd()
  }, [fetchMotd])

  if (!motd) return null
  if (dismissed[motd.id]) return null

  const style = TYPE_STYLES[motd.type] || TYPE_STYLES.info
  const Icon = style.icon

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 text-xs animate-slide-down"
      style={{
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
      }}
    >
      <Icon size={14} style={{ color: style.color, flexShrink: 0 }} />
      <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
        {motd.message}
      </span>
      <button
        onClick={() => {
          setDismissed(motd.id)
          setDismissedState((prev) => ({ ...prev, [motd.id]: Date.now() }))
        }}
        className="shrink-0 cursor-pointer"
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
      >
        <X size={12} />
      </button>
    </div>
  )
}
