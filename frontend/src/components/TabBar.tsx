import { useRef, useEffect, useState, useCallback } from 'react'
import { X, LayoutDashboard, Pin, PinOff } from 'lucide-react'
import { useTabs } from '../contexts/TabContext'
import { api } from '../api/client'

const ORDER_KEY = 'tab_order'
const DEFAULT_ORDER = 'default'

function loadOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveOrder(ids: string[]) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
}

export default function TabBar() {
  const { tabs, activeTab, openTab, closeTab, togglePinTab } = useTabs()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tabOrder, setTabOrder] = useState<string[]>(() => loadOrder() || DEFAULT_ORDER as any)
  const [dragTab, setDragTab] = useState<string | null>(null)
  const [tabHealth, setTabHealth] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/health')
        const ok = res.status === 200
        setTabHealth(new Map(tabs.map((t) => [t.id, ok])))
      } catch {
        setTabHealth(new Map(tabs.map((t) => [t.id, false])))
      }
    }, 15000)
    api.get('/health').then((r) => {
      setTabHealth(new Map(tabs.map((t) => [t.id, r.status === 200])))
    }).catch(() => {
      setTabHealth(new Map(tabs.map((t) => [t.id, false])))
    })
    return () => clearInterval(interval)
  }, [tabs])

  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement
      active?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeTab])

  const orderedTabs = useCallback(() => {
    if (Array.isArray(tabOrder)) {
      const orderMap = new Map(tabOrder.map((id, i) => [id, i]))
      const sorted = [...tabs].sort((a, b) => {
        const ai = orderMap.get(a.id)
        const bi = orderMap.get(b.id)
        if (ai != null && bi != null) return ai - bi
        if (ai != null) return -1
        if (bi != null) return 1
        return 0
      })
      return sorted
    }
    return tabs
  }, [tabs, tabOrder])

  useEffect(() => {
    if (!Array.isArray(tabOrder)) {
      setTabOrder(tabs.map((t) => t.id))
    }
  }, [tabs, tabOrder])

  const handleDragStart = (tabId: string) => {
    setDragTab(tabId)
  }

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    if (!dragTab || dragTab === tabId || !Array.isArray(tabOrder)) return
    const idx = tabOrder.indexOf(dragTab)
    const targetIdx = tabOrder.indexOf(tabId)
    if (idx === -1 || targetIdx === -1) return
    const next = [...tabOrder]
    next.splice(idx, 1)
    next.splice(targetIdx, 0, dragTab)
    setTabOrder(next)
  }

  const handleDrop = () => {
    if (Array.isArray(tabOrder)) saveOrder(tabOrder)
    setDragTab(null)
  }

  if (tabs.length <= 1) {
    return (
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          minHeight: 30,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: 'var(--text-muted)',
        }}
      >
        Dashboard
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      role="tablist"
      style={{
        display: 'flex',
        overflowX: 'auto',
        overflowY: 'hidden',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        minHeight: 30,
        scrollbarWidth: 'thin',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      }}
    >
      <style>{`
        .tab-fkey { opacity: 0; transition: opacity 0.1s; }
        .tab-item:hover .tab-fkey { opacity: 0.7; }
      `}</style>
      {orderedTabs().map((tab, index) => {
        const isActive = tab.id === activeTab
        const health = tabHealth.get(tab.id)
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            data-active={isActive}
            className="tab-item"
            draggable
            onDragStart={() => handleDragStart(tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDrop={handleDrop}
            tabIndex={isActive ? 0 : -1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 8px',
              minWidth: 80,
              maxWidth: 180,
              height: 30,
              cursor: 'pointer',
              userSelect: 'none',
              borderRight: '1px solid var(--border-color)',
              background: isActive ? 'var(--bg-card)' : 'transparent',
              borderTop: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'background 0.1s, color 0.1s',
              flexShrink: 0,
              opacity: dragTab === tab.id ? 0.4 : 1,
            }}
            onClick={() => openTab(tab.path)}
            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
            title={tab.label}
          >
            {index < 12 && (
              <span className="tab-fkey" style={{
                fontSize: 7, color: 'var(--text-muted)',
                marginRight: 2, fontWeight: 500,
                minWidth: 14, textAlign: 'right',
              }}>
                F{index + 1}
              </span>
            )}
            <span
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: health === false ? 'var(--accent-red)' : 'var(--accent-green)',
                flexShrink: 0,
              }}
              title={health === false ? 'Disconnected' : 'Connected'}
            />
            {tab.id === '/' && <LayoutDashboard size={10} style={{ opacity: 0.6, flexShrink: 0 }} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); togglePinTab(tab.id) }}
              style={{
                background: 'none',
                border: 'none',
                color: tab.pinned ? 'var(--accent-yellow)' : 'transparent',
                cursor: 'pointer',
                padding: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { if (!tab.pinned) e.currentTarget.style.color = 'var(--text-muted)' }}
              onMouseLeave={(e) => { if (!tab.pinned) e.currentTarget.style.color = 'transparent' }}
              aria-label={tab.pinned ? `Unpin ${tab.label}` : `Pin ${tab.label}`}
              title={tab.pinned ? 'Unpin tab' : 'Pin tab'}
            >
              {tab.pinned ? <Pin size={8} /> : <PinOff size={8} />}
            </button>
            {!tab.pinned && tab.id !== '/' && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  flexShrink: 0,
                  opacity: 0.5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-red) 20%, transparent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent' }}
                aria-label={`Close ${tab.label}`}
              >
                <X size={10} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
