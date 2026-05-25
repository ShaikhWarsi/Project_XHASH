import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SHORTCUTS = [
  { keys: 'g d', label: 'Go to Dashboard', action: '/' },
  { keys: 'g o', label: 'Go to Orders', action: '/trading/orders' },
  { keys: 'g p', label: 'Go to Portfolio', action: '/trading/portfolio' },
  { keys: 'g b', label: 'Go to Backtest', action: '/strategy/backtest' },
  { keys: 'g s', label: 'Go to Signals', action: '/markets/signals' },
  { keys: 'g c', label: 'Go to Chart', action: '/markets/chart' },
  { keys: 'g h', label: 'Go to Hedge Fund', action: '/ai/hedge-fund' },
  { keys: 'g l', label: 'Go to LLM', action: '/ai/llm' },
  { keys: '?', label: 'Toggle this menu', action: '' },
  { keys: '⌘k', label: 'Command palette', action: '' },
  { keys: '⌘⏎', label: 'Run query / submit', action: '' },
  { keys: 'esc', label: 'Close panel / cancel', action: '' },
]

export default function KeyboardShortcutListener() {
  const [open, setOpen] = useState(false)
  const [buffer, setBuffer] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        return
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        setBuffer('g')
        return
      }

      if (buffer === 'g' && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        for (const s of SHORTCUTS) {
          if (s.keys === `g ${e.key}`) {
            navigate(s.action)
            break
          }
        }
        setBuffer('')
        return
      }

      setBuffer('')
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, buffer, navigate])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="rounded-md p-4 max-w-xs w-full"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Keyboard Shortcuts
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-[10px] font-mono cursor-pointer bg-none border-none"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0 }}
          >
            ✕
          </button>
        </div>
        <div className="space-y-0.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-0.5">
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <kbd
                className="px-1.5 py-0.5 text-[8px] font-mono rounded-sm"
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
