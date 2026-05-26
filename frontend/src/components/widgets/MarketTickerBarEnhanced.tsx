import { useEffect, useState, useRef } from 'react'

interface TickerItem {
  symbol: string
  price: string
  change: string
  up: boolean
}

const SYMBOLS = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'NASDAQ' },
  { symbol: 'DIA', label: 'DOW' },
  { symbol: 'IWM', label: 'RUSSELL' },
  { symbol: 'BTC-USD', label: 'BTC' },
  { symbol: 'ETH-USD', label: 'ETH' },
  { symbol: 'GC=F', label: 'GOLD' },
  { symbol: 'CL=F', label: 'OIL' },
  { symbol: 'AAPL', label: null },
  { symbol: 'MSFT', label: null },
  { symbol: 'GOOGL', label: null },
  { symbol: 'NVDA', label: null },
  { symbol: 'TSLA', label: null },
  { symbol: 'AMZN', label: null },
  { symbol: 'META', label: null },
  { symbol: 'AMD', label: null },
  { symbol: 'JPM', label: null },
  { symbol: 'V', label: null },
  { symbol: 'XOM', label: null },
  { symbol: 'DIS', label: null },
]

function formatPrice(symbol: string, price: number): string {
  if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (symbol === 'GC=F' || symbol === 'CL=F') return price.toFixed(2)
  if (price >= 1000) return price.toFixed(0)
  if (price >= 100) return price.toFixed(1)
  if (price >= 10) return price.toFixed(2)
  if (price >= 1) return price.toFixed(3)
  return price.toFixed(4)
}

export default function MarketTickerBarEnhanced() {
  const [paused, setPaused] = useState(false)
  const [tickers, setTickers] = useState<(TickerItem & { label: string | null })[]>(
    SYMBOLS.map((s) => ({ symbol: s.symbol, label: s.label, price: '\u2014', change: '', up: true }))
  )
  const [error, setError] = useState(false)
  const animRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const symbols = SYMBOLS.map(s => s.symbol)
        const res = await fetch(`/api/v1/market/quotes?symbols=${symbols.join(',')}`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        const updated: (TickerItem & { label: string | null })[] = []
        let anySuccess = false
        for (const s of SYMBOLS) {
          const q = data[s.symbol] || (Array.isArray(data) ? data.find((d: any) => d.symbol === s.symbol) : null)
          if (q && q.c != null) {
            anySuccess = true
            updated.push({
              symbol: s.symbol,
              label: s.label,
              price: formatPrice(s.symbol, q.c),
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

  const items = [...tickers, ...tickers, ...tickers]

  return (
    <div
      className="flex items-center overflow-hidden select-none shrink-0"
      style={{
        height: 40,
        background: 'var(--ticker-bg)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        cursor: 'default',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {error && (
        <div className="flex items-center gap-1 px-3 shrink-0" style={{ color: 'var(--accent-red)', fontSize: 10 }}>
          <span className="font-bold">DATA UNAVAILABLE</span>
        </div>
      )}
      <div
        ref={animRef}
        className="flex items-center"
        style={{
          transform: paused ? 'translateX(0)' : 'translateX(-33.33%)',
          transition: paused ? 'none' : 'transform 90s linear',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        onMouseEnter={() => {
          if (animRef.current) {
            const computed = getComputedStyle(animRef.current)
            const matrix = computed.transform
            animRef.current.style.transition = 'none'
            animRef.current.style.transform = matrix
          }
        }}
        onMouseLeave={() => {
          if (animRef.current) {
            const computed = getComputedStyle(animRef.current)
            const match = computed.transform.match(/matrix\(([^)]+)\)/)
            if (match) {
              const x = parseFloat(match[1].split(', ')[4])
              const remaining = x + 33.33
              const duration = Math.abs(remaining) * (90 / 33.33)
              animRef.current.style.transition = `transform ${duration}s linear`
              animRef.current.style.transform = `translateX(-33.33%)`
            }
          }
        }}
      >
        {items.map((t, i) => (
          <div
            key={`${t.symbol}-${i}`}
            className="flex items-center shrink-0 gap-2"
            style={{ padding: '0 14px', height: 40, borderRight: '1px solid var(--border-color)' }}
          >
            <div className="flex flex-col items-start justify-center" style={{ lineHeight: 1.2 }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: 11, letterSpacing: '0.3px' }}>
                {t.symbol}
              </span>
              {t.label && (
                <span style={{ color: 'var(--text-muted)', fontSize: 8, letterSpacing: '0.3px' }}>
                  {t.label}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end justify-center" style={{ lineHeight: 1.2 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 11 }}>
                {t.price}
              </span>
              <span style={{ color: t.up ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700, fontSize: 9 }}>
                {t.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute', right: 0, top: 0, width: 60, height: 40,
          background: 'linear-gradient(to right, transparent, var(--ticker-bg))',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: 60, height: 40,
          background: 'linear-gradient(to left, transparent, var(--ticker-bg))',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
