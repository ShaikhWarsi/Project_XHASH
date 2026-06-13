import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWatchlist } from '../api/client'

const POPULAR = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BTC-USD', 'ETH-USD', 'AMD', 'JPM', 'V', 'XOM', 'DIS', 'KO', 'PEP', 'WMT', 'CAT']

export default function GlobalSymbolSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('global_symbol_recent') || '[]')
    } catch {
      return []
    }
  })
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchWatchlist('default').then((w) => setWatchlist(w.map((i: any) => i.symbol))).catch((err) => console.warn('[GlobalSymbolSearch] failed:', err))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const allSymbols = [...new Set([...recent, ...watchlist, ...POPULAR])]
  const filtered = query
    ? allSymbols.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : allSymbols.slice(0, 20)

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setSelectedIdx(0)
  }

  const selectSymbol = useCallback((symbol: string) => {
    const updated = [symbol, ...recent.filter((r) => r !== symbol)].slice(0, 10)
    setRecent(updated)
    localStorage.setItem('global_symbol_recent', JSON.stringify(updated))
    setOpen(false)
    setQuery('')
    navigate(`/markets/chart?symbol=${symbol}`)
  }, [navigate, recent])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIdx]) selectSymbol(filtered[selectedIdx]) }
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={() => { setOpen(false); setQuery('') }}>
      <div className="bg-card border border-default rounded-sm shadow-2xl overflow-hidden" style={{ width: 360 }}
        onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Search symbol... (Ctrl+.)"
          className="w-full px-3 py-2 text-[11px] font-mono-data outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}
        />
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-[10px] font-mono-data text-muted text-center">No symbols found</div>
          ) : (
            filtered.map((s, i) => {
              const isRecent = recent.includes(s)
              const isWatchlisted = watchlist.includes(s)
              return (
                <div key={s}
                  onClick={() => selectSymbol(s)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono-data cursor-pointer"
                  style={{
                    background: i === selectedIdx ? 'var(--bg-hover)' : 'transparent',
                    color: i === selectedIdx ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  }}>
                  <span className="flex-1">{s}</span>
                  <div className="flex gap-1">
                    {isRecent && <span className="text-[7px] text-muted border border-default px-0.5 rounded-sm">RECENT</span>}
                    {isWatchlisted && <span className="text-[7px] text-accent-blue border border-default px-0.5 rounded-sm">WATCH</span>}
                  </div>
                  <span className="text-[8px] text-muted">↗</span>
                </div>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between px-3 py-1 border-t border-default text-[7px] text-muted font-mono-data">
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  )
}
