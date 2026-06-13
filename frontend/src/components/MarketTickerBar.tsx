import { useEffect, useRef, useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fetchQuotes } from '../api/client'
import { useToastStore } from '../store/toast'

interface TickerItem {
  symbol: string
  price: string
  change: string
  up: boolean
  sparkline: number[]
  volume?: number
}

const SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'BTC-USD', 'ETH-USD', 'TSLA', 'AAPL', 'NVDA', 'AMZN', 'MSFT', 'GOOGL', 'META', 'AMD', 'INTC', 'NFLX', 'DIS', 'V', 'JPM', 'GS', 'BA', 'CAT', 'XOM', 'CVX', 'PFE', 'JNJ', 'KO', 'PEP', 'WMT']

const MAX_SPARK_POINTS = 20

function formatPrice(symbol: string, price: number): string {
  if (symbol.includes('BTC') || symbol.includes('ETH')) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1000) return price.toFixed(0)
  if (price >= 100) return price.toFixed(1)
  if (price >= 10) return price.toFixed(2)
  if (price >= 1) return price.toFixed(3)
  return price.toFixed(4)
}

function SparklineTooltip() {
  const pts = useMemo(() => {
    let v = Math.random() * 100
    return Array.from({ length: 10 }, () => {
      v += (Math.random() - 0.5) * 10
      return Math.max(v, 0)
    })
  }, [])
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const r = max - min || 1
  const path = pts.map((v, j) => {
    const x = (j / (pts.length - 1)) * 58
    const y = 18 - ((v - min) / r) * 16
    return `${x},${y}`
  }).join(' ')
  return <polyline points={path} fill="none" stroke="var(--accent-cyan)" strokeWidth={1} />
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null
  const w = 28; const h = 14
  const min = Math.min(...data); const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 2) + 1
    const y = h - 1 - ((v - min) / range) * (h - 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" style={{ marginRight: 4 }}>
      <polyline points={points} fill="none" stroke={up ? 'var(--accent-green)' : 'var(--accent-red)'} strokeWidth={1} />
    </svg>
  )
}

export default function MarketTickerBar() {
  const [paused, setPaused] = useState(false)
  const priceHistory = useRef<Map<string, number[]>>(new Map())
  const prevPrices = useRef<Map<string, number>>(new Map())
  const [tickers, setTickers] = useState<TickerItem[]>(SYMBOLS.map((s) => ({ symbol: s, price: '—', change: '', up: true, sparkline: [] })))
  const [error, setError] = useState(false)
  const [pulseItems, setPulseItems] = useState<Set<string>>(new Set())
  const addToast = useToastStore((s) => s.addToast)
  const [hoverSymbol, setHoverSymbol] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  const addToWatchlist = (symbol: string) => {
    try {
      const raw = localStorage.getItem('watchlist_symbols') || ''
      const list = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
      if (list.includes(symbol)) {
        addToast(`${symbol} already in watchlist`, 'info')
        return
      }
      const next = [...list, symbol].slice(0, 50)
      localStorage.setItem('watchlist_symbols', next.join(','))
      addToast(`Added ${symbol} to watchlist`, 'success')
    } catch { /* ignore */ }
  }

  const genSparkline = (): number[] => {
    let v = Math.random() * 100
    return Array.from({ length: 10 }, () => {
      v += (Math.random() - 0.5) * 10
      return Math.max(v, 0)
    })
  }

  useEffect(() => {
    const abortController = new AbortController()
    let interval: ReturnType<typeof setInterval> | null = null
    let hidden = false

    const load = async () => {
      if (hidden) return
      try {
        const quotes = await fetchQuotes(SYMBOLS, abortController.signal)
        const updated: TickerItem[] = []
        const newFlash = new Map<string, 'green' | 'red'>()
        let anySuccess = false
        for (const s of SYMBOLS) {
          const q = quotes[s]
          if (q && q.c != null) {
            anySuccess = true
            const prevPrice = prevPrices.current.get(s)
            if (prevPrice != null && q.c !== prevPrice) {
              newFlash.set(s, q.c > prevPrice ? 'green' : 'red')
              setPulseItems((prev) => new Set([...prev, s]))
              setTimeout(() => setPulseItems((prev) => { const n = new Set(prev); n.delete(s); return n }), 300)
            }
            prevPrices.current.set(s, q.c)
            const hist = priceHistory.current.get(s) || []
            hist.push(q.c)
            if (hist.length > MAX_SPARK_POINTS) hist.shift()
            priceHistory.current.set(s, hist)
            updated.push({
              symbol: s,
              price: formatPrice(s, q.c),
              change: q.dp >= 0 ? `+${q.dp.toFixed(2)}%` : `${q.dp.toFixed(2)}%`,
              up: q.dp >= 0,
              sparkline: [...hist],
              volume: (q as unknown as Record<string, unknown>).v as number,
            })
          }
        }
        if (newFlash.size > 0) {
          setTimeout(() => { /* flash handled via pulseItems */ }, 600)
        }
        if (anySuccess) setTickers(updated)
        setError(!anySuccess)
      } catch {
        if (!abortController.signal.aborted) setError(true)
      }
    }
    load()
    interval = setInterval(load, 30000)

    const onVisibility = () => {
      hidden = document.hidden
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      if (!document.hidden) {
        load()
        interval = setInterval(load, 30000)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval!)
      abortController.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const items = [...tickers, ...tickers]
  const shouldAnimate = !paused

  return (
    <div
      className="flex items-center overflow-hidden select-none sticky top-0 z-30 h-[24px] bg-[var(--ticker-bg)] border-b border-default text-[10px] font-mono-data"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {error && (
        <div className="flex items-center gap-1 px-2 shrink-0 text-[var(--accent-orange)] text-[10px]">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>RECONNECTING...</span>
        </div>
      )}
      <div
        className="flex items-center whitespace-nowrap"
        style={{
          animation: shouldAnimate ? 'ticker-scroll 60s linear infinite' : 'none',
        }}
      >
        {items.map((t, i) => (
          <div
            key={`${t.symbol}-${i}`}
            className="flex items-center shrink-0 px-[10px] border-r border-default h-[24px] relative cursor-pointer"
            aria-label={`${t.symbol}: ${t.price} ${t.change}`}
            onClick={() => addToWatchlist(t.symbol)}
            onMouseEnter={(e) => {
              setHoverSymbol(t.symbol)
              const rect = e.currentTarget.getBoundingClientRect()
              setHoverPos({ x: rect.left, y: rect.top - 60 })
            }}
            onMouseLeave={() => setHoverSymbol(null)}
          >
            {pulseItems.has(t.symbol) && (
              <span className="absolute inset-[-2px] opacity-60 pointer-events-none rounded-sm" style={{ border: `1px solid ${t.up ? 'var(--accent-green)' : 'var(--accent-red)'}`, animation: 'pulse-glow 0.3s ease-out' }} />
            )}
            <Sparkline data={t.sparkline} up={t.up} />
            <span className="text-[var(--accent-cyan)] font-semibold mr-1">{t.symbol}</span>
            <span className="text-[var(--ticker-text)] mr-1">{t.price}</span>
            <span style={{ color: t.up ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {t.change}
            </span>
            {t.volume != null && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-hover">
                <div style={{ width: `${Math.min((t.volume / 10000000) * 100, 100)}%`, height: 2, background: t.up ? 'var(--accent-green)' : 'var(--accent-red)', opacity: 0.4 }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="absolute right-0 top-0 w-10 h-[24px] bg-gradient-to-r from-transparent to-[var(--ticker-bg)] pointer-events-none" />
      {hoverSymbol && (
        <div
          ref={tooltipRef}
          className="fixed z-[100] bg-card border border-default rounded px-2 py-1 font-mono-data text-[9px] pointer-events-none"
          style={{
            left: hoverPos.x,
            top: hoverPos.y,
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          }}
        >
          <div className="text-secondary mb-0.5 font-semibold text-[9px]">{hoverSymbol} News</div>
          <svg width="60" height="20" viewBox="0 0 60 20">
            <SparklineTooltip />
          </svg>
        </div>
      )}
    </div>
  )
}
