import { useRef, useState } from 'react'

interface IndexData {
  symbol: string
  price: number
  change: number
}

const DEFAULT_INDICES: IndexData[] = [
  { symbol: 'SPX', price: 5432.10, change: 0.45 },
  { symbol: 'NDX', price: 18921.45, change: -0.23 },
  { symbol: 'DJI', price: 38765.80, change: 0.12 },
  { symbol: 'RUT', price: 2012.34, change: -0.67 },
  { symbol: 'VIX', price: 14.32, change: -2.15 },
  { symbol: 'FTSE', price: 8123.45, change: 0.08 },
  { symbol: 'DAX', price: 18234.56, change: -0.34 },
  { symbol: 'NKY', price: 38765.00, change: 0.89 },
  { symbol: 'HSI', price: 17234.12, change: -1.23 },
  { symbol: 'AS51', price: 7654.32, change: 0.56 },
]

interface MarketTickerProps {
  indices?: IndexData[]
}

export default function MarketTicker({ indices = DEFAULT_INDICES }: MarketTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  const items = [...indices, ...indices]

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        width: '100%',
        height: 20,
        overflow: 'hidden',
        background: 'var(--ticker-bg)',
        borderBottom: '1px solid var(--border-color)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          animation: paused ? 'none' : 'ticker-scroll 80s linear infinite',
          whiteSpace: 'nowrap',
        }}
      >
        {items.map((item, i) => (
          <div
            key={`${item.symbol}-${i}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '0 12px',
              borderRight: '1px solid var(--border-color)',
            }}
          >
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{item.symbol}</span>
            <span style={{ color: 'var(--ticker-text)' }}>{item.price.toFixed(2)}</span>
            <span
              style={{
                color: item.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              }}
            >
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
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
          height: '100%',
          background: 'linear-gradient(to right, transparent, var(--ticker-bg))',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
