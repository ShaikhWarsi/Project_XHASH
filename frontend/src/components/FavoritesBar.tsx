import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRouteLabel, GROUP_LABELS } from '../utils/routes'

const LS_KEY = 'favorite_pages'

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

  if (favorites.length === 0) return null

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
    </div>
  )
}
