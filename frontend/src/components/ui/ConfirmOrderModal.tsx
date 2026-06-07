import { useState } from 'react'

interface ConfirmOrderModalProps {
  symbol: string
  side: string
  quantity: number
  price: number
  totalValue: number
  portfolioValue: number
  buyingPower: number
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmOrderModal({
  symbol, side, quantity, price, totalValue, portfolioValue, buyingPower, onConfirm, onCancel,
}: ConfirmOrderModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const pctOfEquity = portfolioValue > 0 ? (totalValue / portfolioValue) * 100 : 0
  const exceedsRisk = totalValue > buyingPower * 0.5 || pctOfEquity > 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 8, padding: 20, minWidth: 360, maxWidth: 420,
      }}>
        <div className="font-mono-data text-[13px] font-bold text-primary mb-3">Confirm Order</div>
        <table className="font-mono-data text-[11px] w-full" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td className="text-muted py-1">Symbol</td><td className="text-primary font-semibold text-right">{symbol}</td></tr>
            <tr><td className="text-muted py-1">Side</td><td className="text-right font-semibold" style={{ color: side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{side}</td></tr>
            <tr><td className="text-muted py-1">Quantity</td><td className="text-primary text-right">{quantity}</td></tr>
            <tr><td className="text-muted py-1">Price</td><td className="text-primary text-right">${price.toFixed(2)}</td></tr>
            <tr><td className="text-muted py-1">Total</td><td className="text-primary font-bold text-right">${totalValue.toFixed(2)}</td></tr>
            <tr><td className="text-muted py-1">% of Equity</td><td className={`text-right font-semibold ${pctOfEquity > 1 ? 'text-down' : 'text-up'}`}>{pctOfEquity.toFixed(2)}%</td></tr>
            <tr><td className="text-muted py-1">Buying Power</td><td className="text-primary text-right">${buyingPower.toFixed(2)}</td></tr>
          </tbody>
        </table>

        {exceedsRisk && (
          <div style={{
            margin: '12px 0', padding: '8px 10px', fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            background: 'color-mix(in srgb, var(--accent-red) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)',
            color: 'var(--accent-red)', borderRadius: 4,
          }}>
            ⚠ This order exceeds 1% of portfolio equity or uses &gt;50% of buying power
          </div>
        )}

        <div style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="ack" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ accentColor: 'var(--accent-cyan)' }} />
          <label htmlFor="ack" className="font-mono-data text-[10px] text-secondary">
            I understand the above order details
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{
              background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: 4,
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
            }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!acknowledged}
            style={{
              background: 'var(--accent-cyan)', border: 'none', color: '#000',
              padding: '6px 14px', borderRadius: 4, fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
              cursor: acknowledged ? 'pointer' : 'not-allowed', opacity: acknowledged ? 1 : 0.5,
            }}>
            Confirm {side} {quantity} {symbol}
          </button>
        </div>
      </div>
    </div>
  )
}
