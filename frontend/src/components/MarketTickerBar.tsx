import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fetchQuotes } from '../api/client'

interface TickerItem {
  symbol: string
  price: string
  change: string
  up: boolean
}

const SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'BTC-USD', 'ETH-USD', 'TSLA', 'AAPL', 'NVDA', 'AMZN', 'MSFT', 'GOOGL', 'META', 'AMD', 'INTC', 'NFLX', 'DIS', 'V', 'JPM', 'GS', 'BA', 'CAT', 'XOM', 'CVX', 'PFE', 'JNJ', 'KO', 'PEP', 'WMT']

function formatPrice(symbol: string, price: number): string {
  if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1000) return price.toFixed(0)
  if (price >= 100) return price.toFixed(1)
  if (price >= 10) return price.toFixed(2)
  if (price >= 1) return price.toFixed(3)
  return price.toFixed(4)
}

export default function MarketTickerBar() {
  const [paused, setPaused] = useState(false)
  const [tickers, setTickers] = useState<TickerItem[]>(SYMBOLS.map((s) => ({ symbol: s, price: '—', change: '', up: true })))
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const quotes = await fetchQuotes(SYMBOLS)
        const updated: TickerItem[] = []
        let anySuccess = false
        for (const s of SYMBOLS) {
          const q = quotes[s]
          if (q && q.c != null) {
            anySuccess = true
            updated.push({
              symbol: s,
              price: formatPrice(s, q.c),
              change: q.dp >= 0 ? `+${q.dp.toFixed(2)}%` : `${q.dp.toFixed(2)}%`,
              up: q.dp >= 0,
            })
          }
        }
        if (anySuccess) setTickers(updated)
        setError(!anySuccess)
      } catch {
        setError(true)
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  const items = [...tickers, ...tickers]
  const shouldAnimate = !paused

  return (
    <div
      style={{
        height: 22,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: 'default',
        background: 'var(--ticker-bg)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {error && (
        <div className="flex items-center gap-1 px-2 shrink-0" style={{ color: 'var(--accent-red)', fontSize: 10 }}>
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>DATA UNAVAILABLE</span>
        </div>
      )}
      <div
        className="flex items-center"
        style={{
          animation: shouldAnimate ? 'ticker-scroll 60s linear infinite' : 'none',
          whiteSpace: 'nowrap' as const,
        }}
      >
        {items.map((t, i) => (
          <div
            key={`${t.symbol}-${i}`}
            className="flex items-center shrink-0"
            style={{ padding: '0 10px', borderRight: '1px solid var(--border-color)' }}
            aria-label={`${t.symbol}: ${t.price} ${t.change}`}
          >
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginRight: 4 }}>{t.symbol}</span>
            <span style={{ color: 'var(--ticker-text)', marginRight: 4 }}>{t.price}</span>
            <span style={{ color: t.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {t.change}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 40,
          height: 22,
          background: 'linear-gradient(to right, transparent, var(--ticker-bg))',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
