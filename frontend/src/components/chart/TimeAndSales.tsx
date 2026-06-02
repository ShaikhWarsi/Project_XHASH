import { useEffect, useRef, useState } from 'react'

interface Trade {
  id: number
  time: string
  price: number
  size: number
  exchange: string
  side: 'buy' | 'sell' | 'neutral'
}

const EXCHANGES = ['NYSE', 'NASDAQ', 'CME', 'BATS', 'ARCA']
const MAX_TRADES = 50

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateTrade(basePrice: number, id: number): Trade {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour12: false })
  const price = basePrice * (1 + (Math.random() - 0.5) * 0.002)
  const size = Math.round(Math.random() * 1000 + 100)
  const exchange = randomElement(EXCHANGES)
  const side = price > basePrice ? 'buy' : price < basePrice ? 'sell' : 'neutral'
  return { id, time, price: Math.round(price * 100) / 100, size, exchange, side }
}

interface TimeAndSalesProps {
  basePrice: number
  onClose: () => void
}

export default function TimeAndSales({ basePrice, onClose }: TimeAndSalesProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const idRef = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const isOpen = true

  useEffect(() => {

    const schedule = () => {
      const delay = 500 + Math.random() * 1500
      return setTimeout(() => {
        const newTrade = generateTrade(basePrice, idRef.current++)
        setTrades((prev) => [newTrade, ...prev].slice(0, MAX_TRADES))
        scheduleRef = schedule()
      }, delay)
    }

    let scheduleRef = schedule()
    return () => clearTimeout(scheduleRef)
  }, [basePrice])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [trades.length])

  return (
    <div
      style={{
        width: isOpen ? '220px' : '0px',
        minWidth: isOpen ? '220px' : '0px',
        overflow: 'hidden',
        background: '#0a0f1a',
        borderLeft: isOpen ? '1px solid #1a2744' : 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        fontFamily: "'JetBrains Mono', monospace",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderBottom: '1px solid #1a2744',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '1px',
          color: '#8892a6',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span>TIME &amp; SALES</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8892a6',
            cursor: 'pointer',
            fontSize: '10px',
            padding: 0,
            lineHeight: 1,
          }}
        >
          &#x2715;
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          padding: '4px 8px',
          borderBottom: '1px solid #1a2744',
          fontSize: '8px',
          color: '#8892a6',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          flexShrink: 0,
        }}
      >
        <span style={{ width: '55px', flexShrink: 0 }}>Time</span>
        <span style={{ width: '55px', flexShrink: 0, textAlign: 'right' }}>Price</span>
        <span style={{ width: '50px', flexShrink: 0, textAlign: 'right' }}>Size</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Exch</span>
      </div>
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {trades.map((trade, i) => {
          const sideColor = trade.side === 'buy' ? '#22c55e' : trade.side === 'sell' ? '#ef4444' : '#8892a6'
          const isNew = i < 3

          return (
            <div
              key={trade.id}
              style={{
                display: 'flex',
                padding: '2px 8px',
                fontSize: '10px',
                lineHeight: '16px',
                animation: isNew ? 'fadeInRow 0.4s ease-out' : undefined,
                opacity: 1,
              }}
            >
              <span style={{ width: '55px', flexShrink: 0, color: '#8892a6' }}>
                {trade.time}
              </span>
              <span
                style={{
                  width: '55px',
                  flexShrink: 0,
                  textAlign: 'right',
                  color: sideColor,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {trade.price.toFixed(2)}
              </span>
              <span style={{ width: '50px', flexShrink: 0, textAlign: 'right', color: '#e2e8f0' }}>
                {trade.size.toLocaleString()}
              </span>
              <span style={{ flex: 1, textAlign: 'right', color: '#8892a6', fontSize: '8px' }}>
                {trade.exchange}
              </span>
            </div>
          )
        })}
        {trades.length === 0 && (
          <div
            style={{
              padding: '16px 8px',
              textAlign: 'center',
              color: '#8892a6',
              fontSize: '9px',
            }}
          >
            Waiting for trades...
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeInRow {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
