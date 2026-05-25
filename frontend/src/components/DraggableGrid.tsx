import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'

interface GridItem {
  id: string
  content: ReactNode
  defaultSize?: { w: number; h: number }
  label?: string
}

interface DraggableGridProps {
  items: GridItem[]
  onReorder?: (ids: string[]) => void
  storageKey?: string
  columns?: number
  showControls?: boolean
}

const STORAGE_KEY = 'draggable-grid-layout'

function useResponsiveColumns(base: number): number {
  const [cols, setCols] = useState(base)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth
      if (w < 640) setCols(1)
      else if (w < 1024) setCols(Math.min(base, 2))
      else setCols(base)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [base])
  return cols
}

export default function DraggableGrid({ items, onReorder, storageKey = STORAGE_KEY, columns = 3, showControls = false }: DraggableGridProps) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        const validIds = new Set(items.map((i) => i.id))
        const filtered = parsed.filter((id: string) => validIds.has(id))
        const missing = items.filter((i) => !filtered.includes(i.id)).map((i) => i.id)
        return [...filtered, ...missing]
      }
    } catch {}
    return items.map((i) => i.id)
  })

  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`${storageKey}_visible`) || '{}')
    } catch { return {} }
  })

  const [sizes, setSizes] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`${storageKey}_sizes`) || '{}')
    } catch { return {} }
  })

  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [resizing, setResizing] = useState<string | null>(null)
  const dragEl = useRef<HTMLDivElement | null>(null)
  const ghostEl = useRef<HTMLDivElement | null>(null)
  const resizeStartY = useRef(0)
  const resizeStartH = useRef(0)
  const cols = useResponsiveColumns(columns)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(order))
    } catch {}
  }, [order, storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_visible`, JSON.stringify(visibleItems))
    } catch {}
  }, [visibleItems, storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_sizes`, JSON.stringify(sizes))
    } catch {}
  }, [sizes, storageKey])

  useEffect(() => {
    const validIds = new Set(items.map((i) => i.id))
    setOrder((prev) => {
      const filtered = prev.filter((id) => validIds.has(id))
      const missing = items.filter((i) => !filtered.includes(i.id)).map((i) => i.id)
      if (missing.length > 0) return [...filtered, ...missing]
      return filtered
    })
  }, [items])

  const itemMap = new Map(items.map((i) => [i.id, i]))
  const visibleOrder = order.filter((id) => visibleItems[id] !== false)

  const toggleVisibility = (id: string) => {
    setVisibleItems((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }))
  }

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
    ghost.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`
    document.body.appendChild(ghost)
    ghostEl.current = ghost
    target.style.opacity = '0.4'

    const handleMove = (ev: MouseEvent) => {
      if (ghostEl.current) {
        ghostEl.current.style.left = `${ev.clientX - 20}px`
        ghostEl.current.style.top = `${ev.clientY - 20}px`
      }
      const gridEl = document.getElementById('draggable-grid-container')
      if (!gridEl) return
      const children = gridEl.querySelectorAll('[data-grid-idx]')
      let newOverIdx: number | null = null
      children.forEach((child) => {
        const r = child.getBoundingClientRect()
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          newOverIdx = parseInt(child.getAttribute('data-grid-idx') || '0', 10)
        }
      })
      setOverIdx(newOverIdx)
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
        setOrder((prev) => {
          const next = [...prev]
          const [moved] = next.splice(dragIdx, 1)
          next.splice(overIdx, 0, moved)
          if (onReorder) onReorder(next)
          return next
        })
      }
      setDragIdx(null)
      setOverIdx(null)
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [dragIdx, overIdx, onReorder])

  const handleResizeStart = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(id)
    resizeStartY.current = e.clientY
    resizeStartH.current = sizes[id] || itemMap.get(id)?.defaultSize?.h || 200

    const handleMove = (ev: MouseEvent) => {
      const delta = ev.clientY - resizeStartY.current
      const newH = Math.max(80, resizeStartH.current + delta)
      setSizes((prev) => ({ ...prev, [id]: newH }))
    }

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      setResizing(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [sizes])

  return (
    <div>
      {showControls && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            Widgets ({visibleOrder.length}/{items.length})
          </span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
              className="text-[9px] px-2 py-0.5"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Widgets {showVisibilityMenu ? '▲' : '▼'}
            </button>
            {showVisibilityMenu && (
              <div
                className="absolute top-full right-0 z-30 mt-0.5"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 4,
                  minWidth: 160,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-1.5 px-2 py-0.5 cursor-pointer"
                    style={{
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={visibleItems[item.id] !== false}
                      onChange={() => toggleVisibility(item.id)}
                      style={{ accentColor: 'var(--accent-cyan)' }}
                    />
                    {item.label || item.id}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        id="draggable-grid-container"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 8,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {visibleOrder.map((id, idx) => {
          const item = itemMap.get(id)
          if (!item) return null
          const isDrag = dragIdx === idx
          const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx
          const minH = sizes[id] || item.defaultSize?.h || 80
          const isResizing = resizing === id
          return (
            <div
              key={id}
              data-grid-idx={idx}
              onMouseDown={(e) => handleDragStart(e, idx)}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isOver ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                position: 'relative',
                opacity: isDrag ? 0.4 : 1,
                cursor: 'grab',
                transition: isResizing ? 'none' : 'border-color 0.15s, opacity 0.15s',
                minHeight: minH,
                gridColumn: cols === 1 ? '1' : 'auto',
              }}
            >
              <div
                className="flex items-center px-2 py-1 select-none"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  lineHeight: 1,
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'grab',
                }}
              >
                <span style={{ marginRight: 4, opacity: 0.5 }}>≡</span>
                {item.label && (
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {item.label}
                  </span>
                )}
              </div>
              <div style={{ padding: '8px 10px' }}>
                {item.content}
              </div>
              <div
                onMouseDown={(e) => handleResizeStart(e, id)}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  cursor: 'ns-resize',
                  background: isResizing ? 'var(--accent-cyan)' : 'transparent',
                  borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                }}
                title="Drag to resize"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
