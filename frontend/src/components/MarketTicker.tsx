import { useRef, useState } from 'react'

interface IndexData {
  symbol: string
  price: number
  change: number
}

interface MarketTickerProps {
  indices?: IndexData[]
}

export default function MarketTicker({ indices = [] }: MarketTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  const items = [...indices, ...indices]

  if (indices.length === 0) {
    return (
      <div style={{
        width: '100%', height: 20, display: 'flex', alignItems: 'center',
        background: 'var(--ticker-bg)', borderBottom: '1px solid var(--border-color)',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: 'var(--text-muted)', padding: '0 12px',
      }}>
        No market indices available
      </div>
    )
  }

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
