import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { fetchQuotes } from '../../api/client'

type Preset = 'value' | 'growth' | 'momentum'

interface ScreenerResult {
  symbol: string
  name?: string
  price?: number
  change_percent?: number
}

const PRESET_LABELS: Record<Preset, string> = { value: 'VALUE', growth: 'GROWTH', momentum: 'MOMENTUM' }
const PRESET_COLORS: Record<Preset, string> = { value: 'var(--accent-blue)', growth: 'var(--accent-green)', momentum: 'var(--accent-yellow)' }

const SCREEN_SYMBOLS: Record<Preset, string[]> = {
  value: ['BRK.B', 'JPM', 'VZ', 'KO', 'PFE', 'CVX', 'CSCO', 'INTC'],
  growth: ['NVDA', 'AMZN', 'META', 'TSLA', 'GOOGL', 'AAPL', 'MSFT', 'AMD'],
  momentum: ['PLTR', 'COIN', 'SNOW', 'CRM', 'ADBE', 'NOW', 'DDOG', 'MDB'],
}

export default function ScreenerWidget({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const [activePreset, setActivePreset] = useState<Preset>('growth')
  const [results, setResults] = useState<ScreenerResult[]>([])
  const [loading, setLoading] = useState(true)
  const color = PRESET_COLORS[activePreset]

  useEffect(() => {
    const abort = new AbortController()
    const symbols = SCREEN_SYMBOLS[activePreset]
    setLoading(true)
    fetchQuotes(symbols, abort.signal)
      .then((quotes) => {
        if (abort.signal.aborted) return
        const data = symbols.map((symbol) => {
          const q = quotes[symbol]
          return {
            symbol,
            price: q?.c ?? 0,
            change_percent: q?.dp ?? 0,
          }
        })
        setResults(data)
      })
      .catch(() => {
        if (!abort.signal.aborted) setResults([])
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [activePreset])

  return (
    <BaseWidget id={id} title="STOCK SCREENER" onRemove={onRemove} headerColor={color} isLoading={loading}>
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

        {results.length === 0 && !loading ? (
          <div className="py-4 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            No screener data available
          </div>
        ) : (
          results.map((r) => {
            const pos = (r.change_percent ?? 0) >= 0
            const clr = pos ? 'var(--accent-green)' : 'var(--accent-red)'
            return (
              <div key={r.symbol} className="grid grid-cols-[1fr_65px_55px] gap-1 px-2 py-1 items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div className="font-mono-data text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{r.symbol}</div>
                </div>
                <span className="font-mono-data text-[11px] text-right" style={{ color: 'var(--text-primary)' }}>
                  {r.price != null ? `$${r.price.toFixed(2)}` : '\u2014'}
                </span>
                <span className="font-mono-data text-[11px] font-bold text-right" style={{ color: r.change_percent != null ? clr : 'var(--text-muted)' }}>
                  {r.change_percent != null ? `${pos ? '+' : ''}${r.change_percent.toFixed(1)}%` : '\u2014'}
                </span>
              </div>
            )
          })
        )}

        <div className="py-1 px-2 font-mono-data text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
          <Search size={10} className="inline mr-1" />{results.length} results shown
        </div>
      </div>
    </BaseWidget>
  )
}
