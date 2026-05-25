import { useState, useMemo } from 'react'
import { useLivePrices } from '../contexts/LivePricesContext'
import type { PositionExtended } from '../api/types'

interface PositionTableProps {
  positions: PositionExtended[]
  onClose?: (symbol: string) => void
  showBeta?: boolean
}

export default function PositionTable({ positions, onClose, showBeta = true }: PositionTableProps) {
  const { getPrice } = useLivePrices()
  const [sortBy, setSortBy] = useState<keyof PositionExtended>('symbol')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const livePositions = useMemo(() =>
    positions.map((pos) => {
      const live = getPrice(pos.symbol)
      if (!live) return pos
      return {
        ...pos,
        currentPrice: live.price,
        marketValue: live.price * pos.quantity,
        unrealizedPnl: (live.price - pos.entryPrice) * pos.quantity * (pos.side === 'LONG' ? 1 : -1),
        unrealizedPnlPercent: ((live.price - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'LONG' ? 1 : -1),
      }
    }),
  [positions, getPrice])

  const sorted = [...livePositions].sort((a, b) => {
    const aVal = a[sortBy] ?? 0
    const bVal = b[sortBy] ?? 0
    if (typeof aVal === 'string') return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string)
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const toggleSort = (key: keyof PositionExtended) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
  }

  if (positions.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
        No open positions
      </div>
    )
  }

  const headers = showBeta
    ? ['Symbol', 'Side', 'Qty', 'Entry', 'Mark', 'Value', 'Unrealized P&L', 'Day P&L', 'Beta', '']
    : ['Symbol', 'Side', 'Qty', 'Entry', 'Mark', 'Value', 'Unrealized P&L', 'Day P&L', '']
  const sortKeys: (keyof PositionExtended | '')[] = showBeta
    ? ['symbol', 'side', 'quantity', 'entryPrice', 'currentPrice', 'marketValue', 'unrealizedPnl', 'dayPnl', 'beta', '']
    : ['symbol', 'side', 'quantity', 'entryPrice', 'currentPrice', 'marketValue', 'unrealizedPnl', 'dayPnl', '']

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }} aria-label="Positions table">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            {headers.map((h, i) => (
              <th
                key={h}
                onClick={() => sortKeys[i] && toggleSort(sortKeys[i] as keyof PositionExtended)}
                style={{ padding: '8px 12px', textAlign: i < 2 ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 500, cursor: sortKeys[i] ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                aria-label={`${h}${sortBy === sortKeys[i] ? `, sorted ${sortDir}ending` : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos) => (
            <tr key={pos.symbol} style={{ borderBottom: '1px solid var(--border-color)' }} className="hover:bg-[#2a2d3e]/30 transition-colors">
              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{pos.symbol}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ color: pos.side === 'LONG' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {pos.side}
                </span>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>{pos.quantity}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>${pos.entryPrice.toFixed(2)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>${pos.currentPrice.toFixed(2)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>${pos.marketValue.toLocaleString()}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                <span style={{ color: pos.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  ${pos.unrealizedPnl.toFixed(2)}
                  <span className="ml-1">({pos.unrealizedPnlPercent >= 0 ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%)</span>
                </span>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                <span style={{ color: pos.dayPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  ${pos.dayPnl.toFixed(2)}
                </span>
              </td>
              {showBeta && (
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pos.beta.toFixed(2)}</td>
              )}
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                {onClose && (
                  <button
                    onClick={() => onClose(pos.symbol)}
                    style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }}
                    aria-label={`Close position ${pos.symbol}`}
                  >
                    Close
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
