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

function getGridArea(weight: number, totalWeight: number): { colSpan: number; rowSpan: number } {
  const ratio = weight / totalWeight
  if (ratio > 0.2) return { colSpan: 2, rowSpan: 2 }
  if (ratio > 0.12) return { colSpan: 2, rowSpan: 1 }
  return { colSpan: 1, rowSpan: 1 }
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

  const totalWeight = useMemo(() => sectors.reduce((s, x) => s + x.weight, 0), [sectors])
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, flex: 1 }}>
            {SECTOR_ETFS.map((symbol, idx) => (
              <div key={symbol} className="animate-pulse rounded-sm"
                style={{
                  aspectRatio: '1',
                  backgroundColor: 'var(--border-color)',
                  animationDelay: `${idx * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : sectors.length === 0 ? (
          <div className="flex-1 flex items-center justify-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            No sector data available
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridAutoRows: '1fr',
            gap: 2,
            flex: 1,
          }}>
            {sortedSectors.map((sector) => {
              const isHovered = hoveredSector === sector.symbol
              const area = getGridArea(sector.weight, totalWeight)
              return (
                <div
                  key={sector.symbol}
                  onMouseEnter={() => setHoveredSector(sector.symbol)}
                  onMouseLeave={() => setHoveredSector(null)}
                  className="flex flex-col items-center justify-center cursor-pointer overflow-hidden"
                  style={{
                    gridColumn: `span ${area.colSpan}`,
                    gridRow: `span ${area.rowSpan}`,
                    backgroundColor: getHeatColor(sector.change),
                    border: isHovered ? '1px solid rgba(255,255,255,0.4)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s ease, transform 0.15s ease',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    zIndex: isHovered ? 2 : 1,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="font-bold tracking-wider" style={{
                    fontSize: area.colSpan > 1 ? '11px' : '9px',
                    color: '#fff',
                  }}>
                    {sector.name}
                  </div>
                  <div className="font-bold" style={{
                    fontSize: area.colSpan > 1 ? '13px' : '11px',
                    color: '#fff',
                  }}>
                    {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
                  </div>
                  {isHovered && (
                    <div className="font-mono-data" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 2, fontSize: 8 }}>
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
