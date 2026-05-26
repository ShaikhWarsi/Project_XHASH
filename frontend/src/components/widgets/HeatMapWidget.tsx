import { useMemo, useState } from 'react'
import BaseWidget from './BaseWidget'

const SECTOR_ETFS = ['XLK', 'XLV', 'XLF', 'XLY', 'XLE', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC', 'XLP']

const SECTOR_CONFIG: Record<string, { name: string; weight: number }> = {
  XLK: { name: 'TECH', weight: 5 },
  XLV: { name: 'HEALTH', weight: 4 },
  XLF: { name: 'FINANCE', weight: 4 },
  XLY: { name: 'CONSUMER', weight: 3 },
  XLE: { name: 'ENERGY', weight: 3 },
  XLI: { name: 'INDUSTRIAL', weight: 3 },
  XLB: { name: 'MATERIALS', weight: 2 },
  XLRE: { name: 'REAL ESTATE', weight: 2 },
  XLU: { name: 'UTILITIES', weight: 2 },
  XLC: { name: 'COMM SVCS', weight: 3 },
  XLP: { name: 'STAPLES', weight: 2 },
}

interface SectorData {
  symbol: string
  name: string
  change: number
  price: number
  weight: number
}

function getHeatColor(change: number): string {
  const intensity = Math.min(Math.abs(change) / 2, 1)
  if (change > 0) {
    const g = Math.round(80 + 135 * intensity)
    return `rgb(0, ${g}, ${Math.round(30 * intensity)})`
  } else if (change < 0) {
    const r = Math.round(80 + 135 * intensity)
    return `rgb(${r}, ${Math.round(15 * (1 - intensity))}, ${Math.round(15 * (1 - intensity))})`
  }
  return 'var(--text-muted)'
}

function getBgOpacity(change: number): number {
  return Math.min(Math.abs(change) / 3, 0.6) + 0.15
}

export default function HeatMapWidget({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null)

  const sectors: SectorData[] = useMemo(() => {
    const raw = sessionStorage.getItem('sector_quotes')
    if (!raw) return []
    try {
      const quotes = JSON.parse(raw)
      return quotes.map((q: any) => {
        const config = SECTOR_CONFIG[q.symbol] || { name: q.symbol, weight: 2 }
        return {
          symbol: q.symbol,
          name: config.name,
          change: q.change_percent ?? 0,
          price: q.price ?? 0,
          weight: config.weight,
        }
      }).filter((s: SectorData) => s.price > 0)
    } catch { return [] }
  }, [])

  const sortedSectors = useMemo(() => [...sectors].sort((a, b) => b.weight - a.weight), [sectors])
  const isLoading = sectors.length === 0

  return (
    <BaseWidget id={id} title="SECTOR HEATMAP" onRemove={onRemove} isLoading={isLoading} headerColor="var(--accent-cyan)">
      <div className="p-1 flex flex-col gap-0.5 h-full">
        <div className="flex justify-between items-center px-1 pb-0.5">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#991111' }} />
            <span className="font-mono-data text-[8px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>BEARISH</span>
          </div>
          <span className="font-mono-data text-[8px] font-bold" style={{ color: 'var(--text-muted)' }}>S&P 500 SECTORS</span>
          <div className="flex items-center gap-1">
            <span className="font-mono-data text-[8px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>BULLISH</span>
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#119944' }} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-wrap gap-px content-start">
            {SECTOR_ETFS.map((symbol, idx) => {
              const cfg = SECTOR_CONFIG[symbol] || { weight: 2 }
              return (
                <div key={symbol} className="animate-pulse rounded-sm"
                  style={{
                    flexBasis: cfg.weight >= 4 ? 'calc(50% - 2px)' : cfg.weight >= 3 ? 'calc(33.33% - 2px)' : 'calc(25% - 2px)',
                    minHeight: cfg.weight >= 4 ? '52px' : '40px',
                    backgroundColor: 'var(--border-color)',
                    border: '1px solid var(--border-color)',
                    animationDelay: `${idx * 0.1}s`,
                  }}
                />
              )
            })}
          </div>
        ) : sectors.length === 0 ? (
          <div className="flex-1 flex items-center justify-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            No sector data available
          </div>
        ) : (
          <div className="flex flex-wrap gap-px content-start flex-1">
            {sortedSectors.map((sector) => {
              const isHovered = hoveredSector === sector.symbol
              const bgColor = getHeatColor(sector.change)
              return (
                <div
                  key={sector.symbol}
                  onMouseEnter={() => setHoveredSector(sector.symbol)}
                  onMouseLeave={() => setHoveredSector(null)}
                  className="flex flex-col items-center justify-center cursor-pointer overflow-hidden rounded-sm"
                  style={{
                    flexBasis: sector.weight >= 4 ? 'calc(50% - 2px)' : sector.weight >= 3 ? 'calc(33.33% - 2px)' : 'calc(25% - 2px)',
                    minHeight: sector.weight >= 4 ? '52px' : '40px',
                    backgroundColor: bgColor,
                    opacity: getBgOpacity(sector.change) + (isHovered ? 0.2 : 0),
                    border: isHovered ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="font-bold tracking-wider" style={{
                    fontSize: sector.weight >= 4 ? '10px' : '9px',
                    color: '#fff',
                  }}>
                    {sector.name}
                  </div>
                  <div className="font-bold" style={{
                    fontSize: sector.weight >= 4 ? '12px' : '10px',
                    color: '#fff',
                  }}>
                    {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                  </div>
                  {isHovered && (
                    <div className="font-mono-data text-[8px]" style={{ color: '#fff', marginTop: '1px' }}>
                      {sector.symbol} | ${sector.price.toFixed(2)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </BaseWidget>
  )
}
