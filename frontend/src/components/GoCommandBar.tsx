import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { executeCommand, getSuggestions, getCommandList } from '../commands/registry'

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
  const [historyIdx, setHistoryIdx] = useState(-1)
  const historyRef = useRef<string[]>([])
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
    const trimmed = cmd.trim()
    if (!trimmed) return

    if (trimmed.startsWith(':')) {
      const handled = executeCommand(trimmed)
      if (handled) { setValue(''); inputRef.current?.blur(); return }
    }

    const upper = trimmed.toUpperCase()
    const cmdEntry = COMMANDS[upper]
    if (cmdEntry) {
      navigate(cmdEntry.path)
      setValue('')
      inputRef.current?.blur()
      return
    }
    const symbol = guessSymbol(trimmed)
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
      const trimmed = value.trim()
      if (trimmed) {
        historyRef.current = [trimmed, ...historyRef.current].slice(0, 50)
        setHistoryIdx(-1)
      }
      execute(value)
    }
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
    if (e.key === 'Tab' && value.trim()) {
      e.preventDefault()
      const suggestions = getSuggestions(value)
      if (suggestions.length === 1) {
        setValue(suggestions[0])
      }
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = historyIdx + 1
      if (next < historyRef.current.length) {
        setHistoryIdx(next)
        setValue(historyRef.current[next])
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = historyIdx - 1
      if (next >= 0) {
        setHistoryIdx(next)
        setValue(historyRef.current[next])
      } else {
        setHistoryIdx(-1)
        setValue('')
      }
    }
  }

  const suggestions = value.trim()
    ? value.startsWith(':')
      ? getSuggestions(value)
      : Object.entries(COMMANDS)
          .filter(([k]) => k.startsWith(value.toUpperCase()))
          .slice(0, 6)
          .map(([k, v]) => `${k} — ${v.desc}`)
    : []

  return (
    <div className="relative flex items-center h-[28px] px-2 select-none bg-card border-b border-default">
      <span className="font-mono-data text-[9px] font-bold mr-1.5 text-cyan-400">&lt;GO&gt;</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder="Symbol, command, or :goto/:new/:theme..."
        className="flex-1 bg-transparent border-none outline-none font-mono-data text-[11px] px-1 py-0 text-primary"
        style={{ caretColor: 'var(--accent-cyan)' }}
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 w-72 overflow-hidden bg-card border border-default">
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => {
                const cmd = s.split(' — ')[0]
                if (value.startsWith(':')) {
                  setValue(s)
                } else {
                  execute(cmd)
                }
              }}
              className="flex items-center px-2 py-1 cursor-pointer text-[10px] font-mono-data text-primary hover:bg-hover"
            >
              {s}
            </div>
          ))}
        </div>
      )}
      {focused && !value.trim() && (
        <div className="absolute left-0 top-full z-50 w-72 overflow-hidden bg-card border border-default">
          <div className="px-2 py-1 text-[9px] font-mono-data text-muted">Type :goto, :new, :theme, :alert or a symbol</div>
          {getCommandList().slice(0, 5).map((cmd) => (
            <div
              key={cmd.prefix}
              className="px-2 py-0.5 text-[9px] font-mono-data text-muted"
            >{cmd.prefix} — {cmd.description}</div>
          ))}
        </div>
      )}
    </div>
  )
}
