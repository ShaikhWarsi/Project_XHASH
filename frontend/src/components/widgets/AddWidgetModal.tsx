import { useState } from 'react'
import { X, Search, BarChart3, Activity, Shield, TrendingUp, LayoutGrid } from 'lucide-react'

interface WidgetDef {
  id: string
  name: string
  description: string
  category: 'Charts' | 'Analytics' | 'Risk' | 'Market Data'
  icon: typeof BarChart3
  defaultSize: { w: number; h: number }
}

const WIDGETS: WidgetDef[] = [
  { id: 'kpis', name: 'KPI Cards', description: 'Key performance indicators', category: 'Analytics', icon: BarChart3, defaultSize: { w: 1, h: 60 } },
  { id: 'positions-signals', name: 'Positions & Signals', description: 'Open positions and active signals', category: 'Analytics', icon: Activity, defaultSize: { w: 1, h: 200 } },
  { id: 'equity-curve', name: 'Equity Curve', description: 'Portfolio equity over time', category: 'Charts', icon: TrendingUp, defaultSize: { w: 1, h: 340 } },
  { id: 'risk-status', name: 'Risk & Status', description: 'Risk metrics and system status', category: 'Risk', icon: Shield, defaultSize: { w: 1, h: 200 } },
  { id: 'sector-allocation', name: 'Sector Allocation', description: 'Portfolio sector breakdown', category: 'Analytics', icon: LayoutGrid, defaultSize: { w: 1, h: 160 } },
  { id: 'attribution', name: 'Attribution', description: 'Performance attribution analysis', category: 'Analytics', icon: BarChart3, defaultSize: { w: 1, h: 120 } },
  { id: 'heatmap', name: 'Sector Heatmap', description: 'S&P 500 sector performance heatmap', category: 'Market Data', icon: LayoutGrid, defaultSize: { w: 1, h: 260 } },
  { id: 'top-movers', name: 'Top Movers', description: 'Top gainers and losers', category: 'Market Data', icon: TrendingUp, defaultSize: { w: 1, h: 280 } },
  { id: 'risk-metrics', name: 'Risk Metrics', description: 'Portfolio risk dashboard', category: 'Risk', icon: Shield, defaultSize: { w: 1, h: 300 } },
  { id: 'screener', name: 'Stock Screener', description: 'Value/Growth/Momentum screener', category: 'Market Data', icon: Search, defaultSize: { w: 1, h: 300 } },
]

const CATEGORIES = ['Charts', 'Analytics', 'Risk', 'Market Data'] as const

interface AddWidgetModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (widgetId: string) => void
  activeWidgets: string[]
}

export default function AddWidgetModal({ isOpen, onClose, onAdd, activeWidgets }: AddWidgetModalProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')

  if (!isOpen) return null

  const filtered = WIDGETS.filter((w) => {
    if (activeCategory !== 'All' && w.category !== activeCategory) return false
    if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-[520px] max-h-[560px] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="font-mono-data text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--accent-cyan)' }}>
            ADD WIDGET
          </h2>
          <button onClick={onClose} className="bg-none border-none cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search widgets..."
              className="w-full font-mono-data text-[10px] outline-none px-6 py-1.5 rounded-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div className="flex gap-1 mt-2">
            {['All', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="font-mono-data text-[9px] font-bold px-2 py-1 cursor-pointer rounded-sm uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: activeCategory === cat ? 'var(--accent-cyan)' : 'transparent',
                  border: `1px solid ${activeCategory === cat ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  color: activeCategory === cat ? '#000' : 'var(--text-muted)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map((widget) => {
              const Icon = widget.icon
              const isActive = activeWidgets.includes(widget.id)
              return (
                <button
                  key={widget.id}
                  onClick={() => { if (!isActive) { onAdd(widget.id); onClose() } }}
                  disabled={isActive}
                  className="flex items-start gap-2 p-2 rounded-sm text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,229,255,0.08)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    opacity: isActive ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--accent-cyan)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-color)' }}
                >
                  <div className="p-1 rounded-sm shrink-0" style={{ backgroundColor: 'rgba(0,229,255,0.1)' }}>
                    <Icon size={12} style={{ color: 'var(--accent-cyan)' }} />
                  </div>
                  <div>
                    <div className="font-mono-data text-[10px] font-bold" style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {widget.name}
                    </div>
                    <div className="font-mono-data text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {widget.description}
                    </div>
                    <div className="font-mono-data text-[7px] mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      {widget.category}
                    </div>
                  </div>
                  {isActive && (
                    <span className="ml-auto font-mono-data text-[8px]" style={{ color: 'var(--accent-cyan)' }}>ACTIVE</span>
                  )}
                </button>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="py-8 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
              No widgets match your search
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
