import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import BaseWidget from './BaseWidget'

const SCAN_TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
  'AMD', 'INTC', 'JPM', 'GS', 'BAC', 'WMT', 'DIS', 'BA', 'XOM', 'CVX', 'COIN', 'PLTR',
]

interface QuoteItem {
  symbol: string
  price: number
  change_percent: number
}

export default function TopMoversWidget({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers')
  const [gainers, setGainers] = useState<QuoteItem[]>([])
  const [losers, setLosers] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = sessionStorage.getItem('mover_quotes')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        setGainers(data.gainers || [])
        setLosers(data.losers || [])
      } catch {}
    }
    setLoading(false)
  }, [])

  const list = tab === 'gainers' ? gainers : losers

  return (
    <BaseWidget id={id} title="TOP MOVERS" onRemove={onRemove} isLoading={loading} headerColor="var(--accent-green)">
      <div className="p-1">
        <div className="flex mx-1 mb-2 overflow-hidden rounded-sm" style={{ border: '1px solid var(--border-color)' }}>
          {(['gainers', 'losers'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1 border-none cursor-pointer uppercase font-bold font-mono-data text-[9px] transition-colors"
              style={{
                backgroundColor: tab === t ? (t === 'gainers' ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--bg-card)',
                color: tab === t ? '#000' : 'var(--text-muted)',
              }}
            >
              {t === 'gainers' ? '\u25B2 GAINERS' : '\u25BC LOSERS'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_80px_70px] gap-1 px-2 py-1 font-mono-data text-[9px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
          <span>SYMBOL</span>
          <span className="text-right">PRICE</span>
          <span className="text-right">CHANGE%</span>
        </div>

        {list.length === 0 ? (
          <div className="py-4 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            No data available. Run market data fetch first.
          </div>
        ) : list.slice(0, 7).map((q) => {
          const pos = q.change_percent >= 0
          const clr = pos ? 'var(--accent-green)' : 'var(--accent-red)'
          return (
            <div key={q.symbol} className="grid grid-cols-[1fr_80px_70px] gap-1 px-2 py-1.5 items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-1">
                {pos ? <TrendingUp size={10} color={clr} /> : <TrendingDown size={10} color={clr} />}
                <span className="font-mono-data text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{q.symbol}</span>
              </div>
              <span className="font-mono-data text-[11px] text-right" style={{ color: 'var(--text-primary)' }}>
                ${q.price.toFixed(2)}
              </span>
              <span className="font-mono-data text-[11px] font-bold text-right" style={{ color: clr }}>
                {pos ? '+' : ''}{q.change_percent.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </BaseWidget>
  )
}
