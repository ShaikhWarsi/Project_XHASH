import { useRef, useEffect } from 'react'
import { X, LayoutDashboard, Pin, PinOff } from 'lucide-react'
import { useTabs } from '../contexts/TabContext'

export default function TabBar() {
  const { tabs, activeTab, openTab, closeTab, togglePinTab } = useTabs()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement
      active?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeTab])

  if (tabs.length <= 1) return null

  return (
    <div
      ref={scrollRef}
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
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab
        return (
          <div
            key={tab.id}
            data-active={isActive}
            className="tab-item"
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
