import { useState } from 'react'

interface OrderDetails {
  symbol: string
  side: 'buy' | 'sell'
  size: number
  price: number
  type: string
  estimatedValue: number
  positionCap?: number
  leverage?: number
  dailyLoss?: number
}

interface Props {
  details: OrderDetails
  onConfirm: (acknowledged: string[]) => void
  onCancel: () => void
  warnings: string[]
}

export default function OrderConfirmationModal({ details, onConfirm, onCancel, warnings }: Props) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set())
  const allAcknowledged = warnings.every(w => acknowledged.has(w))

  const toggle = (warning: string) => {
    setAcknowledged(prev => {
      const next = new Set(prev)
      if (next.has(warning)) next.delete(warning)
      else next.add(warning)
      return next
    })
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 10000, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #0d1117)',
          border: '1px solid var(--border-color, #1a2332)',
          borderRadius: 8, padding: 16, width: 380,
        }}
      >
        <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
          ⚠ Confirm Order
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 12 }}>
          <Detail label="Symbol" value={details.symbol} />
          <Detail label="Side" value={details.side.toUpperCase()} color={details.side === 'buy' ? '#22c55e' : '#ef4444'} />
          <Detail label="Size" value={details.size.toLocaleString()} />
          <Detail label="Price" value={`$${details.price.toFixed(2)}`} />
          <Detail label="Type" value={details.type} />
          <Detail label="Est. Value" value={`$${details.estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          {details.leverage && <Detail label="Leverage" value={`${details.leverage}x`} />}
        </div>

        {warnings.map(w => (
          <label key={w} style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            padding: '6px 8px', marginBottom: 4, borderRadius: 4,
            background: acknowledged.has(w) ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${acknowledged.has(w) ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={acknowledged.has(w)}
              onChange={() => toggle(w)}
              style={{ marginTop: 2, accentColor: '#22c55e' }}
            />
            <span style={{ color: acknowledged.has(w) ? 'var(--text-muted)' : '#ef4444', fontSize: 9, lineHeight: 1.4 }}>
              {w}
            </span>
          </label>
        ))}

        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '6px 12px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm([...acknowledged])}
            disabled={!allAcknowledged}
            style={{
              flex: 1, padding: '6px 12px', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: allAcknowledged ? 'pointer' : 'not-allowed',
              background: allAcknowledged ? '#ef4444' : 'rgba(239,68,68,0.3)',
              border: 'none', color: allAcknowledged ? '#fff' : 'rgba(255,255,255,0.3)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: color || 'var(--text-primary)', textAlign: 'right', fontWeight: 600 }}>{value}</span>
    </>
  )
}
