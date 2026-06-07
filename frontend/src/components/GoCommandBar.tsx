import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const COMMANDS: Record<string, { path: string; desc: string }> = {
  'HELP': { path: '/help', desc: 'Help & Documentation' },
  'CHART': { path: '/markets/chart', desc: 'Chart View' },
  'NEWS': { path: '/research/geo', desc: 'News Feed' },
  'BUY': { path: '/trading/paper-trading?side=buy', desc: 'Place Buy Order' },
  'SELL': { path: '/trading/paper-trading?side=sell', desc: 'Place Sell Order' },
  'ORDERS': { path: '/trading/orders', desc: 'View Orders' },
  'PORTFOLIO': { path: '/trading/portfolio', desc: 'View Portfolio' },
  'WATCHLIST': { path: '/markets/watchlist', desc: 'Watchlist' },
  'SIGNALS': { path: '/markets/signals', desc: 'Signals Dashboard' },
  'BACKTEST': { path: '/strategy/backtest', desc: 'Backtest' },
  'OPTIMIZE': { path: '/strategy/optimizer', desc: 'Strategy Optimizer' },
  'AGENTS': { path: '/ai/council', desc: 'Agent Council' },
  'SETTINGS': { path: '/settings', desc: 'Settings' },
}

function guessSymbol(input: string): string | null {
  const upper = input.toUpperCase().trim()
  if (/^[A-Z]{1,5}$/.test(upper) || /^[A-Z]{1,5}-USD$/.test(upper)) return upper
  return null
}

export default function GoCommandBar() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const execute = useCallback((cmd: string) => {
    const upper = cmd.trim().toUpperCase()
    const cmdEntry = COMMANDS[upper]
    if (cmdEntry) {
      navigate(cmdEntry.path)
      setValue('')
      inputRef.current?.blur()
      return
    }
    const symbol = guessSymbol(cmd)
    if (symbol) {
      navigate(`/markets/chart?symbol=${symbol}`)
      setValue('')
      inputRef.current?.blur()
      return
    }
  }, [navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      execute(value)
    }
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  const filtered = value.trim()
    ? Object.entries(COMMANDS)
        .filter(([k]) => k.startsWith(value.toUpperCase()))
        .slice(0, 6)
    : []

  return (
    <div className="relative flex items-center px-2 py-0.5 select-none" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
      <span className="font-mono-data text-[9px] font-bold text-accent-cyan mr-1">&lt;GO&gt;</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder="Symbol or command... (F2)"
        className="flex-1 bg-transparent border-none outline-none font-mono-data text-[10px] text-primary px-1 py-0.5"
        style={{ caretColor: 'var(--accent-cyan)' }}
      />
      {focused && value.trim() && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 w-64 bg-card border border-default shadow-xl rounded-sm overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          {filtered.map(([k, v]) => (
            <div key={k} onMouseDown={() => execute(k)} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-hover" style={{ fontSize: 10 }}>
              <span className="text-accent-cyan font-bold">{k}</span>
              <span className="text-muted">{v.desc}</span>
              <span className="flex-1" />
              <span className="text-[7px] text-muted">&crarr;</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
