import { useState } from 'react'
import { X, Newspaper, CalendarDays, MessageSquare, PanelRightClose, PanelRightOpen, Brain, TrendingUp } from 'lucide-react'
import NewsPanel from './NewsPanel'
import CalendarPanel from './CalendarPanel'
import ChatPanel from './ChatPanel'
import NewsCoMovement from '../NewsCoMovement'
import EarningsSummary from '../EarningsSummary'

const TABS = [
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'comovement', label: 'Co-Move', icon: Brain },
  { id: 'earnings', label: 'Earnings', icon: TrendingUp },
] as const

type TabId = (typeof TABS)[number]['id']

interface RightSidebarProps {
  open: boolean
  onToggle: () => void
}

export default function RightSidebar({ open, onToggle }: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('news')

  return (
    <>
      <button
        onClick={onToggle}
        title={open ? 'Close sidebar' : 'Open sidebar'}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-5 h-12 cursor-pointer"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRight: 'none',
          borderRadius: '4px 0 0 4px',
          color: 'var(--text-muted)',
        }}
      >
        {open ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
      </button>

      <aside
        className="fixed right-0 top-0 h-full z-30 flex flex-col transition-all duration-200 ease-in-out"
        style={{
          width: open ? 320 : 0,
          background: 'var(--bg-card)',
          borderLeft: open ? '1px solid var(--border-color)' : 'none',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between px-2 h-9 shrink-0 border-b border-default" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-sm cursor-pointer transition-colors"
                  style={{
                    background: activeTab === tab.id ? 'var(--accent-blue)' : 'transparent',
                    color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
                    border: 'none',
                  }}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={onToggle}
            className="flex items-center justify-center w-5 h-5 cursor-pointer"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'news' && <NewsPanel />}
          {activeTab === 'calendar' && <CalendarPanel />}
          {activeTab === 'chat' && <ChatPanel />}
          {activeTab === 'comovement' && <NewsCoMovement />}
          {activeTab === 'earnings' && <EarningsSummary />}
        </div>

        <div
          className="flex items-center justify-between px-2 h-6 shrink-0 text-[9px] font-mono"
          style={{
            borderTop: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
          }}
        >
          <span>{TABS.find((t) => t.id === activeTab)?.label}</span>
          <span>v0.1</span>
        </div>
      </aside>
    </>
  )
}
