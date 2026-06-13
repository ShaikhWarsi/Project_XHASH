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
      <div className="bg-secondary border-b border-default min-h-[30px] flex items-center px-3 font-mono text-[9px] text-muted">
        Dashboard
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      role="tablist"
      className="flex overflow-x-auto overflow-y-hidden bg-secondary border-b border-default min-h-[30px] [scrollbar-width:thin] font-mono text-[10px]"
    >
      {orderedTabs().map((tab, index) => {
        const isActive = tab.id === activeTab
        const health = tabHealth.get(tab.id)
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            data-active={isActive}
            draggable
            onDragStart={() => handleDragStart(tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDrop={handleDrop}
            tabIndex={isActive ? 0 : -1}
            className={`flex items-center gap-1 px-2 min-w-[80px] max-w-[180px] h-[30px] cursor-pointer select-none border-r border-default shrink-0 transition-[background,color] duration-100 group ${
              isActive
                ? 'bg-card text-primary border-t-2 border-t-accent-cyan'
                : 'bg-transparent text-muted border-t-2 border-t-transparent hover:bg-hover hover:text-secondary'
            }`}
            style={{ opacity: dragTab === tab.id ? 0.4 : 1 }}
            onClick={() => openTab(tab.path)}
            title={tab.label}
          >
            {index < 12 && (
              <span className="text-[7px] text-muted mr-0.5 font-medium min-w-[14px] text-right tab-fkey peer">
                F{index + 1}
              </span>
            )}
            <span className="inline-block w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: health === false ? 'var(--accent-red)' : 'var(--accent-green)' }}
              title={health === false ? 'Disconnected' : 'Connected'}
            />
            {tab.id === '/' && <LayoutDashboard size={10} className="opacity-60 shrink-0" />}
            <span className={`truncate ${isActive ? 'font-semibold' : ''}`}>
              {tab.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); togglePinTab(tab.id) }}
              className={`bg-transparent border-none cursor-pointer p-0.5 flex items-center justify-center radius-md shrink-0 ${
                tab.pinned ? 'text-accent-yellow' : 'text-transparent hover:text-muted'
              }`}
              aria-label={tab.pinned ? `Unpin ${tab.label}` : `Pin ${tab.label}`}
              title={tab.pinned ? 'Unpin tab' : 'Pin tab'}
            >
              {tab.pinned ? <Pin size={8} /> : <PinOff size={8} />}
            </button>
            {!tab.pinned && tab.id !== '/' && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                className="bg-transparent border-none text-muted cursor-pointer p-0.5 flex items-center justify-center radius-md shrink-0 opacity-50"
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
      <style>{`
        .tab-fkey { opacity: 0; transition: opacity 0.1s; }
        .group:hover .tab-fkey, [data-active="true"] .tab-fkey { opacity: 0.7; }
      `}</style>
    </div>
  )
}
