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
    const aVal = (a as unknown as Record<string, unknown>)[sortBy] ?? 0
    const bVal = (b as unknown as Record<string, unknown>)[sortBy] ?? 0
    if (typeof aVal === 'string') return sortDir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string)
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
  }

  if (positions.length === 0) {
    return (
      <div className="p-6 text-center text-muted text-xs">
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs" aria-label="Positions table">
        <thead>
          <tr className="border-b border-default">
            {headers.map((h, i) => (
              <th
                key={h}
                onClick={() => sortKeys[i] && toggleSort(sortKeys[i])}
                className="px-3 py-2 text-muted font-medium whitespace-nowrap"
                style={{ textAlign: i < 2 ? 'left' : 'right', cursor: sortKeys[i] ? 'pointer' : 'default' }}
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
            <tr key={pos.symbol} className="border-b border-default hover:bg-[#2a2d3e]/30 transition-colors">
              <td className="px-3 py-2.5 font-semibold text-primary">{pos.symbol}</td>
              <td className="px-3 py-2.5">
                <span style={{ color: pos.side === 'LONG' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {pos.side}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right text-primary">{pos.quantity}</td>
              <td className="px-3 py-2.5 text-right text-primary">${pos.entryPrice.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-right text-primary">${pos.currentPrice.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-right text-primary">${pos.marketValue.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right">
                <span style={{ color: pos.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  ${pos.unrealizedPnl.toFixed(2)}
                  <span className="ml-1">({pos.unrealizedPnlPercent >= 0 ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%)</span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span style={{ color: pos.dayPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  ${pos.dayPnl.toFixed(2)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">{renderEditable('stopLoss', (pos as unknown as Record<string, unknown>).stopLoss as number, 'Stop')}</td>
              <td className="px-3 py-2.5 text-right">{renderEditable('takeProfit', (pos as unknown as Record<string, unknown>).takeProfit as number, 'Target')}</td>
              <td className="px-3 py-2.5 text-right">{renderEditable('trailingStop', (pos as unknown as Record<string, unknown>).trailingStop as number, 'Trail')}</td>
              {showBeta && (
                <td className="px-3 py-2.5 text-right text-secondary">{pos.beta.toFixed(2)}</td>
              )}
              <td className="px-3 py-2.5 text-right">
                {onClose && (
                  <button
                    onClick={() => onClose(pos.symbol)}
                    className="bg-red-900/20 text-red-400 border-none rounded px-2 py-1 text-[10px] cursor-pointer"
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
