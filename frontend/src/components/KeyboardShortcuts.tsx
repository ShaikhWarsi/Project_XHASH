import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'

const MOD = navigator.platform.startsWith('Mac') ? '⌘' : '^'

const NAV_SHORTCUTS = [
  { keys: 'g 1', label: 'Dashboard', action: '/' },
  { keys: 'g c', label: 'Chart', action: '/markets/chart' },
  { keys: 'g w', label: 'Watchlist', action: '/markets/watchlist' },
  { keys: 'g s', label: 'Signals', action: '/markets/signals' },
  { keys: 'g t', label: 'Structure', action: '/markets/structure' },
  { keys: 'g o', label: 'Orders', action: '/trading/orders' },
  { keys: 'g p', label: 'Portfolio', action: '/trading/portfolio' },
  { keys: 'g f', label: 'Paper Trading', action: '/trading/paper-trading' },
  { keys: 'g r', label: 'Risk Dashboard', action: '/risk' },
  { keys: 'g b', label: 'Backtest', action: '/strategy/backtest' },
  { keys: 'g l', label: 'Strategy Lab', action: '/strategy/lab' },
  { keys: 'g a', label: 'AI Agents', action: '/ai/agents' },
  { keys: 'g h', label: 'Hedge Fund', action: '/ai/hedge-fund' },
  { keys: 'g m', label: 'Hedge Flow', action: '/ai/hedge-flow' },
  { keys: 'g n', label: 'Factor Analysis', action: '/research/factor-analysis' },
  { keys: 'g q', label: 'SQL Research', action: '/research/sql' },
  { keys: 'g d', label: 'Data Pipeline', action: '/data/pipeline' },
  { keys: 'g e', label: 'Signal Engines', action: '/data/signal-engines' },
  { keys: 'g g', label: 'Settings', action: '/settings' },
  { keys: 'g u', label: 'Strategy Code', action: '/strategy/code' },
  { keys: 'g v', label: 'Visual Strategy', action: '/strategy/visual' },
  { keys: 'g x', label: 'Screener', action: '/markets/screener' },
  { keys: 'g z', label: 'Factor Zoo', action: '/research/factor-zoo' },
]

const CTRL_SHORTCUTS = [
  { keys: `${MOD}1`, label: 'Dashboard' },
  { keys: `${MOD}2`, label: 'Chart' },
  { keys: `${MOD}3`, label: 'Watchlist' },
  { keys: `${MOD}4`, label: 'Signals' },
  { keys: `${MOD}5`, label: 'Orders' },
  { keys: `${MOD}6`, label: 'Portfolio' },
  { keys: `${MOD}7`, label: 'Risk' },
  { keys: `${MOD}8`, label: 'Agents' },
  { keys: `${MOD}9`, label: 'Backtest' },
  { keys: `${MOD}0`, label: 'LLM' },
  { keys: `${MOD}O`, label: 'Options Chain' },
  { keys: `${MOD}U`, label: 'Calendar' },
  { keys: `${MOD}E`, label: 'Settings' },
]

const F_KEY_ROUTES = [
  { keys: 'F1', label: 'Dashboard', action: '/' },
  { keys: 'F2', label: 'Chart', action: '/markets/chart' },
  { keys: 'F3', label: 'Watchlist', action: '/markets/watchlist' },
  { keys: 'F4', label: 'Signals', action: '/markets/signals' },
  { keys: 'F5', label: 'Orders', action: '/trading/orders' },
  { keys: 'F6', label: 'Portfolio', action: '/trading/portfolio' },
  { keys: 'F7', label: 'Risk', action: '/risk' },
  { keys: 'F8', label: 'Agents', action: '/ai/agents' },
  { keys: 'F9', label: 'Backtest', action: '/strategy/backtest' },
  { keys: 'F10', label: 'Options Chain', action: '/markets/options' },
  { keys: 'F11', label: 'Calendar', action: '/markets/calendar' },
  { keys: 'F12', label: 'Toggle Chat', action: '__toggle_chat' },
]

const MISC_SHORTCUTS = [
  { keys: '?', label: 'Toggle this menu' },
  { keys: `${MOD}K`, label: 'Command palette' },
  { keys: 'g <key>', label: 'Navigate to page' },
  { keys: 'F1-F12', label: 'Tab navigation / Chat' },
  { keys: 'esc', label: 'Close panel / cancel' },
]

export default function KeyboardShortcutListener() {
  const [open, setOpen] = useState(false)
  const [buffer, setBuffer] = useState('')
  const navigate = useNavigate()
  const { toggleMode } = useInterfaceMode()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      let node = e.target as HTMLElement | null
      while (node) {
        if (node.hasAttribute?.('data-no-hotkeys') || node.closest?.('[data-no-hotkeys]')) return
        node = node.parentElement
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        return
      }

      // F1-F12 navigation
      if (e.key.startsWith('F') && !e.metaKey && !e.ctrlKey) {
        const fNum = parseInt(e.key.slice(1), 10)
        if (fNum >= 1 && fNum <= 12) {
          e.preventDefault()
          const route = F_KEY_ROUTES[fNum - 1]
          if (route) {
            if (route.action === '__toggle_chat') {
              toggleMode()
            } else {
              navigate(route.action)
            }
          }
          return
        }
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        setBuffer('g')
        return
      }

      if (buffer === 'g' && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        const key = e.key.toLowerCase()
        for (const s of NAV_SHORTCUTS) {
          if (s.keys === `g ${key}`) {
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
  }, [open, buffer, navigate, toggleMode])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh]"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="rounded-md"
        style={{
          maxWidth: 520,
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
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
        <div className="overflow-y-auto p-3">
          <div className="mb-3">
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Quick Nav (g then key)
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              {NAV_SHORTCUTS.map((s) => (
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
          <div className="mb-3">
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Ctrl+Number Shortcuts
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              {CTRL_SHORTCUTS.map((s) => (
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
          <div className="mb-3">
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              F-Key Navigation
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              {F_KEY_ROUTES.map((s) => (
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
          <div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              General
            </div>
            {MISC_SHORTCUTS.map((s) => (
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
    </div>
  )
}
