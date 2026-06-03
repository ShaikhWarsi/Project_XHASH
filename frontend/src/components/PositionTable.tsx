import { useState, useMemo } from 'react'
import { useLivePrices } from '../contexts/LivePricesContext'
import type { PositionExtended } from '../api/types'

interface PositionTableProps {
  positions: PositionExtended[]
  onClose?: (symbol: string) => void
  onUpdate?: (symbol: string, updates: Partial<{ stopLoss: number; takeProfit: number; trailingStop: number }>) => void
  showBeta?: boolean
}

export default function PositionTable({ positions, onClose, onUpdate, showBeta = true }: PositionTableProps) {
  const { getPrice } = useLivePrices()
  const [sortBy, setSortBy] = useState<string>('symbol')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<{ symbol: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')

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
    const aVal = (a as any)[sortBy] ?? 0
    const bVal = (b as any)[sortBy] ?? 0
    if (typeof aVal === 'string') return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string)
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const toggleSort = (key: string) => {
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
    ? ['Symbol', 'Side', 'Qty', 'Entry', 'Mark', 'Value', 'Unrealized P&L', 'Day P&L', 'Stop', 'Target', 'Trail', 'Beta', '']
    : ['Symbol', 'Side', 'Qty', 'Entry', 'Mark', 'Value', 'Unrealized P&L', 'Day P&L', 'Stop', 'Target', 'Trail', '']
  const sortKeys: (keyof PositionExtended | string)[] = showBeta
    ? ['symbol', 'side', 'quantity', 'entryPrice', 'currentPrice', 'marketValue', 'unrealizedPnl', 'dayPnl', 'stopLoss', 'takeProfit', 'trailingStop', 'beta', '']
    : ['symbol', 'side', 'quantity', 'entryPrice', 'currentPrice', 'marketValue', 'unrealizedPnl', 'dayPnl', 'stopLoss', 'takeProfit', 'trailingStop', '']

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }} aria-label="Positions table">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            {headers.map((h, i) => (
              <th
                key={h}
                onClick={() => sortKeys[i] && toggleSort(sortKeys[i])}
                style={{ padding: '8px 12px', textAlign: i < 2 ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 500, cursor: sortKeys[i] ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                aria-label={`${h}${sortBy === sortKeys[i] ? `, sorted ${sortDir}ending` : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos) => {
            const renderEditable = (field: string, value: number | undefined | null, label: string) => {
              const isEditing = editing?.symbol === pos.symbol && editing?.field === field
              return isEditing ? (
                <input autoFocus type="number" step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => {
                    if (editValue !== '' && onUpdate) {
                      onUpdate(pos.symbol, { [field]: parseFloat(editValue) })
                    }
                    setEditing(null)
                    setEditValue('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editValue !== '' && onUpdate) {
                        onUpdate(pos.symbol, { [field]: parseFloat(editValue) })
                      }
                      setEditing(null)
                      setEditValue('')
                    }
                    if (e.key === 'Escape') { setEditing(null); setEditValue('') }
                  }}
                  style={{ width: 60, background: 'var(--bg-app)', border: '1px solid var(--accent-blue)', borderRadius: 2, padding: '1px 4px', fontSize: 10, color: 'var(--text-primary)', textAlign: 'right' }}
                />
              ) : (
                <span onClick={() => { setEditing({ symbol: pos.symbol, field }); setEditValue(value != null ? String(value) : '') }}
                  style={{ cursor: 'text', borderBottom: '1px dashed var(--border-color)', padding: '1px 2px', color: value != null ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  title={`Click to edit ${label}`}
                >{value != null ? `$${value.toFixed(2)}` : '—'}</span>
              )
            }
            return (
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
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{renderEditable('stopLoss', (pos as any).stopLoss, 'Stop')}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{renderEditable('takeProfit', (pos as any).takeProfit, 'Target')}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{renderEditable('trailingStop', (pos as any).trailingStop, 'Trail')}</td>
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
          )})}
        </tbody>
      </table>
    </div>
  )
}
