import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Loader2, Plus } from 'lucide-react'
import { searchStocks, addToWatchlist } from '../api/client'

interface StockSearchProps {
  onSelect?: (symbol: string) => void
  label?: string
  renderAs?: 'button' | 'input'
}

export default function StockSearch({ onSelect, label = 'Search stocks...', renderAs = 'input' }: StockSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ symbol: string; description: string; type: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setOpen(v => !v)
        setQuery('')
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    setSearchError(false)
    try {
      const res = await searchStocks(q)
      setResults(res)
      setSelectedIndex(0)
    } catch {
      setResults([])
      setSearchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  const handleSelect = (symbol: string) => {
    setOpen(false)
    setQuery('')
    if (onSelect) {
      onSelect(symbol)
    } else {
      navigate(`/chart?symbol=${symbol}`)
    }
  }

  const handleAddToWatchlist = async (symbol: string, description: string) => {
    try {
      await addToWatchlist(symbol, description, 'default')
    } catch (err) { console.warn('[StockSearch] Failed to add to watchlist:', err) }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIndex]) { handleSelect(results[selectedIndex].symbol) }
  }

  if (!open) {
    if (renderAs === 'input') {
      return (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 w-full bg-[#1e2235] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-[#9aa0a6] hover:border-[#3a3d4e] transition-colors">
          <Search className="w-4 h-4" />
          <span>{label}</span>
          <span className="ml-auto text-xs text-[#5f6368]">⌘J</span>
        </button>
      )
    }
    return (
      <button onClick={() => setOpen(true)} className="bg-[#3b82f6] text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
        {label}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl animate-slide-down"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ borderBottom: '1px solid var(--border-color)' }} className="flex items-center px-3">
          <Search className="w-4 h-4 text-[#9aa0a6] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search stocks..."
            className="w-full bg-transparent px-3 py-3 text-sm outline-none text-white"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#9aa0a6] animate-spin shrink-0" />}
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {results.length === 0 && !loading && (
            <div className="text-sm p-4 text-center text-[#5f6368]">
              {searchError ? 'Search unavailable — market data service may be down' : query ? 'No results found' : 'Type to search stocks'}
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={r.symbol}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group"
              style={{
                background: i === selectedIndex ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
              }}
              onClick={() => handleSelect(r.symbol)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <TrendingUp className="w-4 h-4 shrink-0 text-[#9aa0a6]" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.description || r.symbol}</div>
                <div className="text-xs text-[#9aa0a6]">{r.symbol} | {r.type}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleAddToWatchlist(r.symbol, r.description) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2a2d3e] text-[#9aa0a6] hover:text-white transition-all"
                title="Add to watchlist"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-[#5f6368]" style={{ borderTop: '1px solid var(--border-color)' }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  )
}