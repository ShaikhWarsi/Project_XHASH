import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import BaseWidget from './BaseWidget'

type Preset = 'value' | 'growth' | 'momentum'

interface ScreenerResult {
  symbol: string
  name?: string
  price?: number
  change_percent?: number
}

const PRESET_LABELS: Record<Preset, string> = { value: 'VALUE', growth: 'GROWTH', momentum: 'MOMENTUM' }
const PRESET_COLORS: Record<Preset, string> = { value: 'var(--accent-blue)', growth: 'var(--accent-green)', momentum: 'var(--accent-yellow)' }

const SCREEN_DATA: Record<Preset, ScreenerResult[]> = {
  value: [
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', price: 426.50, change_percent: 0.8 },
    { symbol: 'JPM', name: 'JPMorgan Chase', price: 198.30, change_percent: 1.2 },
    { symbol: 'VZ', name: 'Verizon', price: 41.20, change_percent: -0.3 },
    { symbol: 'KO', name: 'Coca-Cola', price: 62.10, change_percent: 0.5 },
    { symbol: 'PFE', name: 'Pfizer', price: 28.40, change_percent: -0.7 },
    { symbol: 'CVX', name: 'Chevron', price: 158.90, change_percent: 1.1 },
    { symbol: 'CSCO', name: 'Cisco', price: 49.80, change_percent: 0.4 },
    { symbol: 'INTC', name: 'Intel', price: 31.20, change_percent: -1.5 },
  ],
  growth: [
    { symbol: 'NVDA', name: 'NVIDIA', price: 875.30, change_percent: 3.2 },
    { symbol: 'AMZN', name: 'Amazon', price: 178.50, change_percent: 1.8 },
    { symbol: 'META', name: 'Meta Platforms', price: 505.60, change_percent: 2.1 },
    { symbol: 'TSLA', name: 'Tesla', price: 245.80, change_percent: -0.9 },
    { symbol: 'GOOGL', name: 'Alphabet', price: 165.40, change_percent: 1.5 },
    { symbol: 'AAPL', name: 'Apple', price: 192.50, change_percent: 0.7 },
    { symbol: 'MSFT', name: 'Microsoft', price: 425.20, change_percent: 1.3 },
    { symbol: 'AMD', name: 'AMD', price: 162.80, change_percent: -2.1 },
  ],
  momentum: [
    { symbol: 'PLTR', name: 'Palantir', price: 24.50, change_percent: 5.8 },
    { symbol: 'COIN', name: 'Coinbase', price: 245.30, change_percent: 4.2 },
    { symbol: 'SNOW', name: 'Snowflake', price: 165.80, change_percent: 3.5 },
    { symbol: 'CRM', name: 'Salesforce', price: 298.40, change_percent: 2.8 },
    { symbol: 'ADBE', name: 'Adobe', price: 568.20, change_percent: -1.2 },
    { symbol: 'NOW', name: 'ServiceNow', price: 780.50, change_percent: 2.5 },
    { symbol: 'DDOG', name: 'Datadog', price: 128.40, change_percent: 3.1 },
    { symbol: 'MDB', name: 'MongoDB', price: 385.60, change_percent: -0.5 },
  ],
}

export default function ScreenerWidget({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const [activePreset, setActivePreset] = useState<Preset>('growth')

  const results = useMemo(() => SCREEN_DATA[activePreset], [activePreset])
  const color = PRESET_COLORS[activePreset]

  return (
    <BaseWidget id={id} title="STOCK SCREENER" onRemove={onRemove} headerColor={color}>
      <div className="p-1">
        <div className="flex gap-1 mx-1 mb-2">
          {(['value', 'growth', 'momentum'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePreset(p)}
              className="flex-1 py-1 font-bold font-mono-data text-[9px] uppercase cursor-pointer rounded-sm transition-colors"
              style={{
                border: `1px solid ${activePreset === p ? PRESET_COLORS[p] : 'var(--border-color)'}`,
                backgroundColor: activePreset === p ? PRESET_COLORS[p] : 'var(--bg-card)',
                color: activePreset === p ? '#000' : 'var(--text-muted)',
              }}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_65px_55px] gap-1 px-2 py-1 font-mono-data text-[9px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
          <span>SYMBOL</span>
          <span className="text-right">PRICE</span>
          <span className="text-right">CHG%</span>
        </div>

        {results.map((r) => {
          const pos = (r.change_percent ?? 0) >= 0
          const clr = pos ? 'var(--accent-green)' : 'var(--accent-red)'
          return (
            <div key={r.symbol} className="grid grid-cols-[1fr_65px_55px] gap-1 px-2 py-1 items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div className="font-mono-data text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{r.symbol}</div>
                {r.name && <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-muted)' }}>{r.name.substring(0, 18)}</div>}
              </div>
              <span className="font-mono-data text-[11px] text-right" style={{ color: 'var(--text-primary)' }}>
                {r.price != null ? `$${r.price.toFixed(2)}` : '\u2014'}
              </span>
              <span className="font-mono-data text-[11px] font-bold text-right" style={{ color: r.change_percent != null ? clr : 'var(--text-muted)' }}>
                {r.change_percent != null ? `${pos ? '+' : ''}${r.change_percent.toFixed(1)}%` : '\u2014'}
              </span>
            </div>
          )
        })}

        <div className="py-1 px-2 font-mono-data text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
          <Search size={10} className="inline mr-1" />8 results shown
        </div>
      </div>
    </BaseWidget>
  )
}
