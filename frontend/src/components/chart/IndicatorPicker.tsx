import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Search, Star } from 'lucide-react'

interface IndicatorDef {
  name: string
  category: string
  description?: string
  default_params?: Record<string, number>
}

interface IndicatorPickerProps {
  onSelect: (indicator: IndicatorDef) => void
  onClose: () => void
}

const FALLBACK_INDICATORS: IndicatorDef[] = [
  { name: 'SMA', category: 'Trend', description: 'Simple Moving Average', default_params: { period: 20 } },
  { name: 'EMA', category: 'Trend', description: 'Exponential Moving Average', default_params: { period: 20 } },
  { name: 'WMA', category: 'Trend', description: 'Weighted Moving Average', default_params: { period: 20 } },
  { name: 'BB', category: 'Trend', description: 'Bollinger Bands', default_params: { period: 20, stddev: 2 } },
  { name: 'RSI', category: 'Momentum', description: 'Relative Strength Index', default_params: { period: 14 } },
  { name: 'MACD', category: 'Momentum', description: 'MACD', default_params: { fast: 12, slow: 26, signal: 9 } },
  { name: 'Stochastic', category: 'Momentum', description: 'Stochastic Oscillator', default_params: { k: 14, d: 3 } },
  { name: 'ATR', category: 'Volatility', description: 'Average True Range', default_params: { period: 14 } },
  { name: 'VWAP', category: 'Volume', description: 'Volume Weighted Average Price', default_params: {} },
  { name: 'Ichimoku', category: 'Trend', description: 'Ichimoku Cloud', default_params: {} },
  { name: 'OBV', category: 'Volume', description: 'On Balance Volume', default_params: {} },
  { name: 'Volume Profile', category: 'Volume', description: 'Volume Profile', default_params: {} },
  { name: 'Heikin Ashi', category: 'Chart', description: 'Heikin Ashi candles', default_params: {} },
]

const CATEGORY_COLORS: Record<string, string> = {
  Trend: 'var(--accent-blue)',
  Momentum: 'var(--accent-purple)',
  Volatility: 'var(--accent-yellow)',
  Volume: 'var(--accent-cyan)',
  Chart: 'var(--accent-green)',
}

const FAV_KEY = 'indicator_favorites'

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') }
  catch { return [] }
}

function saveFavorites(favs: string[]) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs))
}

export function IndicatorPicker({ onSelect, onClose }: IndicatorPickerProps) {
  const [query, setQuery] = useState('')
  const [apiIndicators, setApiIndicators] = useState<IndicatorDef[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites())

  useEffect(() => {
    let cancelled = false
    fetch('/api/chart/ta/available-indicators')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data.indicators || []
        setApiIndicators(list)
      })
      .catch(() => { if (!cancelled) setApiIndicators([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const allIndicators = apiIndicators.length > 0 ? apiIndicators : FALLBACK_INDICATORS

  const toggleFavorite = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
      saveFavorites(next)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return allIndicators
    const q = query.toLowerCase()
    return allIndicators.filter((ind) =>
      ind.name.toLowerCase().includes(q) ||
      (ind.description || '').toLowerCase().includes(q) ||
      (ind.category || '').toLowerCase().includes(q)
    )
  }, [allIndicators, query])

  const favoriteItems = useMemo(() => {
    if (query.trim()) return []
    return allIndicators.filter((ind) => favorites.includes(ind.name))
  }, [allIndicators, favorites, query])

  const categorized = useMemo(() => {
    const map = new Map<string, IndicatorDef[]>()
    for (const ind of filtered) {
      const cat = ind.category || 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(ind)
    }
    return Array.from(map.entries())
  }, [filtered])

  const renderIndicator = (ind: IndicatorDef) => {
    const cat = ind.category || 'Other'
    const isFav = favorites.includes(ind.name)
    return (
      <div key={ind.name}
        onClick={() => onSelect(ind)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 6px', borderRadius: 3, cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(ind.name) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, display: 'flex', color: isFav ? '#f59e0b' : 'var(--text-muted)',
            flexShrink: 0, opacity: isFav ? 1 : 0.3,
          }}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={9} fill={isFav ? '#f59e0b' : 'none'} />
        </button>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: CATEGORY_COLORS[cat] || 'var(--text-muted)',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 10, fontWeight: 500 }}>{ind.name}</div>
          {ind.description && (
            <div style={{ color: 'var(--text-muted)', fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ind.description}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 100,
      width: 280, maxHeight: 360,
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 6, padding: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, padding: '2px 4px', background: 'var(--input-bg)', borderRadius: 4, border: '1px solid var(--input-border)' }}>
        <Search size={10} style={{ color: 'var(--text-muted)' }} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search indicators..."
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 10, outline: 'none', fontFamily: 'inherit' }}
        />
        {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 9 }}>X</button>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && apiIndicators.length === 0 ? (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 9 }}>Loading...</div>
        ) : (
          <>
            {favoriteItems.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
                  color: '#f59e0b', padding: '2px 4px', marginBottom: 2,
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  Favorites ({favoriteItems.length})
                </div>
                {favoriteItems.map(renderIndicator)}
              </div>
            )}
            {categorized.map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 6 }}>
                <div style={{
                  fontSize: 8, fontWeight: 600, textTransform: 'uppercase',
                  color: CATEGORY_COLORS[cat] || 'var(--text-muted)',
                  padding: '2px 4px', marginBottom: 2,
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  {cat} ({items.length})
                </div>
                {items.map(renderIndicator)}
              </div>
            ))}
          </>
        )}
        {!loading && categorized.length === 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 9 }}>No indicators match "{query}"</div>
        )}
      </div>
    </div>
  )
}
