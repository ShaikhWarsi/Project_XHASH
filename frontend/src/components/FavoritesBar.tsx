import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRouteLabel, GROUP_LABELS } from '../utils/routes'
import { BarChart3, X, Plus } from 'lucide-react'

const LS_KEY = 'favorite_pages'
const TICKER_LS_KEY = 'favorite_tickers'

interface TickerFav {
  symbol: string
  timeframe: string
  indicator: string
}

export default function FavoritesBar() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragEl = useRef<HTMLDivElement | null>(null)
  const ghostEl = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(LS_KEY)
        setFavorites(raw ? JSON.parse(raw) : [])
      } catch { setFavorites([]) }
    }
    window.addEventListener('storage', handler)
    window.addEventListener('favorites-changed', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('favorites-changed', handler)
    }
  }, [])

  const persist = useCallback((ids: string[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(ids))
    setFavorites(ids)
    window.dispatchEvent(new Event('favorites-changed'))
  }, [])

  const grouped = favorites.reduce<Record<string, string[]>>((acc, id) => {
    const path = id === '' ? '/' : `/${id}`
    let group = 'markets'
    if (id !== '') {
      const parts = id.split('/')
      group = parts[0]
    }
    if (!acc[group]) acc[group] = []
    acc[group].push(id)
    return acc
  }, {})

  const handleDragStart = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    setDragIdx(idx)
    const target = e.currentTarget as HTMLDivElement
    dragEl.current = target

    const ghost = target.cloneNode(true) as HTMLDivElement
    ghost.style.position = 'fixed'
    ghost.style.pointerEvents = 'none'
    ghost.style.opacity = '0.7'
    ghost.style.zIndex = '9999'
    ghost.style.width = `${target.offsetWidth}px`
    ghost.style.fontSize = '10px'
    document.body.appendChild(ghost)
    ghostEl.current = ghost
    target.style.opacity = '0.3'

    const handleMove = (ev: MouseEvent) => {
      if (ghostEl.current) {
        ghostEl.current.style.left = `${ev.clientX - 20}px`
        ghostEl.current.style.top = `${ev.clientY - 20}px`
      }
      const bar = document.getElementById('favorites-bar')
      if (!bar) return
      const children = bar.querySelectorAll('[data-fav-idx]')
      let newIdx: number | null = null
      children.forEach((child) => {
        const r = child.getBoundingClientRect()
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          newIdx = parseInt(child.getAttribute('data-fav-idx') || '0', 10)
        }
      })
      setOverIdx(newIdx)
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      if (ghostEl.current) {
        document.body.removeChild(ghostEl.current)
        ghostEl.current = null
      }
      if (dragEl.current) {
        dragEl.current.style.opacity = '1'
        dragEl.current = null
      }
      if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
        const next = [...favorites]
        const [moved] = next.splice(dragIdx, 1)
        next.splice(overIdx, 0, moved)
        persist(next)
      }
      setDragIdx(null)
      setOverIdx(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [dragIdx, overIdx, favorites, persist])

  const removeFavorite = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    persist(favorites.filter((f) => f !== id))
  }, [favorites, persist])

  const [tickerFavs, setTickerFavs] = useState<TickerFav[]>(() => {
    try { return JSON.parse(localStorage.getItem(TICKER_LS_KEY) || '[]') }
    catch { return [] }
  })
  const [showTickerPopover, setShowTickerPopover] = useState(false)
  const [tickerInput, setTickerInput] = useState({ symbol: '', timeframe: '1d', indicator: '' })

  const addTickerFav = () => {
    if (!tickerInput.symbol.trim()) return
    const next = [...tickerFavs, { ...tickerInput, symbol: tickerInput.symbol.toUpperCase(), timeframe: tickerInput.timeframe || '1d', indicator: tickerInput.indicator }]
    setTickerFavs(next)
    localStorage.setItem(TICKER_LS_KEY, JSON.stringify(next))
    setShowTickerPopover(false)
    setTickerInput({ symbol: '', timeframe: '1d', indicator: '' })
  }

  const removeTickerFav = (idx: number) => {
    const next = tickerFavs.filter((_, i) => i !== idx)
    setTickerFavs(next)
    localStorage.setItem(TICKER_LS_KEY, JSON.stringify(next))
  }

  if (favorites.length === 0 && tickerFavs.length === 0) {
    return (
      <div
        id="favorites-bar"
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          minHeight: 26,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--text-muted)',
        }}
      >
        ★ No favorites — click ★ in any page to add
      </div>
    )
  }

  return (
    <div
      id="favorites-bar"
      className="flex items-center gap-1 px-3 overflow-x-auto whitespace-nowrap"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        paddingTop: 3,
        paddingBottom: 3,
        minHeight: 26,
      }}
    >
      <span className="text-[9px] uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)', marginRight: 4 }}>
        ★ {favorites.length}
      </span>
      {Object.entries(grouped).map(([group, ids]) => (
        <div key={group} className="flex items-center gap-1">
          {Object.keys(grouped).length > 1 && (
            <span className="text-[8px] uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              {GROUP_LABELS[group] || group} |
            </span>
          )}
          {ids.map((id, idx) => {
            const path = id === '' ? '/' : `/${id}`
            const label = getRouteLabel(path) || id.replace(/-/g, ' ')
            const actualIdx = favorites.indexOf(id)
            return (
              <div
                key={id}
                data-fav-idx={actualIdx}
                className="flex items-center gap-1 shrink-0"
                style={{
                  background: dragIdx === actualIdx ? 'transparent' : 'var(--bg-hover)',
                  border: overIdx === actualIdx && dragIdx !== actualIdx ? '1px dashed var(--accent-cyan)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'grab',
                  padding: '1px 6px',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'border-color 0.1s, opacity 0.1s',
                  opacity: dragIdx === actualIdx ? 0.3 : 1,
                }}
                onMouseDown={(e) => handleDragStart(e, actualIdx)}
                onClick={() => navigate(path)}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <button
                  onClick={(e) => removeFavorite(e, id)}
                  className="flex items-center justify-center"
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: 0, fontSize: 8, opacity: 0.5,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      ))}
      {tickerFavs.map((tf, idx) => (
        <div
          key={`ticker-${idx}`}
          className="flex items-center gap-1 shrink-0"
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            padding: '1px 6px',
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onClick={() => navigate(`/markets/chart?symbol=${tf.symbol}&timeframe=${tf.timeframe}`)}
        >
          <BarChart3 size={8} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{tf.symbol}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>{tf.timeframe}</span>
          {tf.indicator && <span style={{ color: 'var(--text-secondary)', fontSize: 8 }}>{tf.indicator}</span>}
          <button
            onClick={(e) => { e.stopPropagation(); removeTickerFav(idx) }}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 0, fontSize: 8, opacity: 0.5,
              lineHeight: 1,
            }}
          >
            <X size={8} />
          </button>
        </div>
      ))}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowTickerPopover(!showTickerPopover)}
          className="flex items-center gap-1 shrink-0"
          style={{
            background: 'none',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '1px 6px',
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Plus size={8} /> Add Ticker
        </button>
        {showTickerPopover && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 50,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: 8,
              minWidth: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              placeholder="Symbol"
              value={tickerInput.symbol}
              onChange={(e) => setTickerInput((p) => ({ ...p, symbol: e.target.value }))}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '3px 6px',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
            <input
              placeholder="Timeframe (1d)"
              value={tickerInput.timeframe}
              onChange={(e) => setTickerInput((p) => ({ ...p, timeframe: e.target.value }))}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '3px 6px',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
            <input
              placeholder="Indicator (SMA)"
              value={tickerInput.indicator}
              onChange={(e) => setTickerInput((p) => ({ ...p, indicator: e.target.value }))}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '3px 6px',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
            <button
              onClick={addTickerFav}
              style={{
                background: 'var(--accent-cyan)',
                border: 'none',
                color: '#000',
                cursor: 'pointer',
                padding: '3px 8px',
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
