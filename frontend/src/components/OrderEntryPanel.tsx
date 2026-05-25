import { useState } from 'react'
import { useLivePrices } from '../contexts/LivePricesContext'
import { placeOrder } from '../api/client'
import { useToastStore } from '../store/toast'
import type { OrderRequest } from '../api/types'

type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP' | 'OCO'
type OrderSide = 'BUY' | 'SELL' | 'BUY_TO_COVER' | 'SELL_SHORT'
type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK'

interface OrderEntryPanelProps {
  symbol?: string
  currentPrice?: number
  onOrderPlaced?: () => void
}

export default function OrderEntryPanel({ symbol: initialSymbol = '', currentPrice, onOrderPlaced }: OrderEntryPanelProps) {
  const { getPrice } = useLivePrices()
  const addToast = useToastStore((s) => s.addToast)

  const [symbol, setSymbol] = useState(initialSymbol)
  const [side, setSide] = useState<OrderSide>('BUY')
  const [orderType, setOrderType] = useState<OrderType>('MARKET')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState(currentPrice?.toString() || '')
  const [stopPrice, setStopPrice] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [trailingStop, setTrailingStop] = useState('')
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('DAY')
  const [reduceOnly, setReduceOnly] = useState(false)
  const [ocoSymbol, setOcoSymbol] = useState('')
  const [ocoPrice, setOcoPrice] = useState('')
  const [ocoStopPrice, setOcoStopPrice] = useState('')
  const [bracketTakeProfit, setBracketTakeProfit] = useState('')
  const [bracketStopLoss, setBracketStopLoss] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const livePrice = symbol ? getPrice(symbol.toUpperCase()) : null
  const displayPrice = currentPrice || livePrice?.price || 0

  const handleSubmit = async () => {
    if (!symbol.trim() || !quantity) return
    setSubmitting(true)
    try {
      const order: OrderRequest = {
        symbol: symbol.toUpperCase(),
        side,
        quantity: parseFloat(quantity),
        orderType,
      } as OrderRequest
      if (orderType === 'LIMIT' || orderType === 'STOP_LIMIT') order.price = parseFloat(price)
      if (orderType === 'STOP' || orderType === 'STOP_LIMIT') order.stopPrice = parseFloat(stopPrice)
      if (orderType === 'STOP_LIMIT') order.limitPrice = parseFloat(limitPrice)
      if (orderType === 'TRAILING_STOP') order.trailingStop = parseFloat(trailingStop)
      if (orderType === 'OCO') {
        order.ocoSymbol = ocoSymbol.toUpperCase()
        order.ocoPrice = parseFloat(ocoPrice)
        order.ocoStopPrice = parseFloat(ocoStopPrice)
      }
      order.timeInForce = timeInForce
      order.reduceOnly = reduceOnly
      if (bracketTakeProfit) order.bracketTakeProfit = parseFloat(bracketTakeProfit)
      if (bracketStopLoss) order.bracketStopLoss = parseFloat(bracketStopLoss)

      await placeOrder(order)
      addToast(`Order placed: ${side} ${quantity} ${symbol.toUpperCase()}`, 'success')
      onOrderPlaced?.()
    } catch (err: any) {
      addToast(`Order failed: ${err?.response?.data?.detail || err?.message || 'Unknown error'}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const orderValue = displayPrice * (parseFloat(quantity) || 0)

  return (
    <div className="bg-card border border-default rounded-lg overflow-hidden">
      <div style={{ padding: 'var(--card-padding)' }} className="border-b border-default">
        <h3 className="text-sm font-semibold text-primary">Order Entry</h3>
      </div>

      <div className="space-y-3" style={{ padding: 'var(--card-padding)' }}>
        <div className="grid grid-cols-2 gap-2">
          {(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP', 'OCO'] as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              aria-label={`Order type: ${t.replace('_', ' ')}`}
              aria-pressed={orderType === t}
              className="rounded-sm px-2 py-1 text-[10px] font-medium cursor-pointer border"
              style={{
                background: orderType === t ? 'var(--accent-blue)' : 'var(--bg-hover)',
                color: orderType === t ? '#fff' : 'var(--text-secondary)',
                borderColor: orderType === t ? 'var(--accent-blue)' : 'var(--border-color)',
              }}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['BUY', 'SELL', 'BUY_TO_COVER', 'SELL_SHORT'] as OrderSide[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              aria-label={`Order side: ${s.replace(/_/g, ' ')}`}
              aria-pressed={side === s}
              className="rounded-sm px-2 py-1.5 text-[11px] font-semibold cursor-pointer border"
              style={{
                background: side === s ? (s.startsWith('BUY') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'var(--bg-hover)',
                color: side === s ? (s.startsWith('BUY') ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-secondary)',
                borderColor: side === s ? (s.startsWith('BUY') ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--border-color)',
              }}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div>
          <label className="text-[10px] text-muted">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            aria-label="Symbol"
            className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }}
          />
        </div>

        <div>
          <label className="text-[10px] text-muted">Quantity</label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            step="any"
            placeholder="0"
            aria-label="Quantity"
            className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }}
          />
        </div>

        {(orderType === 'LIMIT' || orderType === 'STOP_LIMIT') && (
          <div>
            <label className="text-[10px] text-muted">Price</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="0.01"
              placeholder={displayPrice ? `$${displayPrice}` : '0.00'}
              aria-label="Price"
              className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }}
            />
          </div>
        )}

        {(orderType === 'STOP' || orderType === 'STOP_LIMIT') && (
          <div>
            <label className="text-[10px] text-muted">Stop Price</label>
            <input
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              type="number"
              step="0.01"
              placeholder="0.00"
              aria-label="Stop price"
              className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }}
            />
          </div>
        )}

        {orderType === 'STOP_LIMIT' && (
          <div>
            <label className="text-[10px] text-muted">Limit Price</label>
            <input
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              type="number"
              step="0.01"
              placeholder="0.00"
              aria-label="Limit price"
              className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }}
            />
          </div>
        )}

        {orderType === 'TRAILING_STOP' && (
          <div>
            <label className="text-[10px] text-muted">Trailing Stop (%)</label>
            <input
              value={trailingStop}
              onChange={(e) => setTrailingStop(e.target.value)}
              type="number"
              step="0.1"
              placeholder="2.0"
              aria-label="Trailing stop percentage"
              className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }}
            />
          </div>
        )}

        {orderType === 'OCO' && (
          <>
            <div>
              <label className="text-[10px] text-muted">OCO Symbol</label>
              <input value={ocoSymbol} onChange={(e) => setOcoSymbol(e.target.value.toUpperCase())} placeholder="e.g. SPY" className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }} />
            </div>
            <div>
              <label className="text-[10px] text-muted">OCO Price</label>
              <input value={ocoPrice} onChange={(e) => setOcoPrice(e.target.value)} type="number" step="0.01" className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }} />
            </div>
            <div>
              <label className="text-[10px] text-muted">OCO Stop Price</label>
              <input value={ocoStopPrice} onChange={(e) => setOcoStopPrice(e.target.value)} type="number" step="0.01" className="w-full border border-default rounded-sm px-2 py-1.5 text-xs text-primary" style={{ background: 'var(--bg-primary)' }} />
            </div>
          </>
        )}

        <div>
          <label className="text-[10px] text-muted">Bracket Orders (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input value={bracketTakeProfit} onChange={(e) => setBracketTakeProfit(e.target.value)} type="number" step="0.01" placeholder="Take Profit" className="w-full border border-default rounded-sm px-2 py-1.5 text-[11px] text-primary" style={{ background: 'var(--bg-primary)' }} />
            </div>
            <div>
              <input value={bracketStopLoss} onChange={(e) => setBracketStopLoss(e.target.value)} type="number" step="0.01" placeholder="Stop Loss" className="w-full border border-default rounded-sm px-2 py-1.5 text-[11px] text-primary" style={{ background: 'var(--bg-primary)' }} />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted">Time in Force</label>
          <div className="flex gap-1">
            {(['DAY', 'GTC', 'IOC', 'FOK'] as TimeInForce[]).map((t) => (
              <button
                key={t}
                onClick={() => setTimeInForce(t)}
                aria-label={`Time in force: ${t}`}
                aria-pressed={timeInForce === t}
                className="flex-1 rounded-sm px-1 py-1 text-[10px] cursor-pointer"
                style={{
                  background: timeInForce === t ? 'var(--accent-blue)' : 'var(--bg-hover)',
                  color: timeInForce === t ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-[11px] text-secondary">
          <input type="checkbox" checked={reduceOnly} onChange={(e) => setReduceOnly(e.target.checked)} aria-label="Reduce only" />
          Reduce Only
        </label>

        {displayPrice > 0 && quantity && (
          <div className="p-2 rounded-sm text-[11px]" style={{ background: 'var(--bg-hover)' }}>
            <div className="flex justify-between text-secondary">
              <span>Est. Value</span>
              <span className="text-primary font-semibold">${orderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-secondary">
              <span>Market Price</span>
              <span className="text-primary">${displayPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !symbol || !quantity}
          aria-label={submitting ? 'Submitting order' : `Submit ${side.replace(/_/g, ' ')} order for ${quantity || '0'} ${symbol.toUpperCase() || ''}`}
          className="w-full rounded-sm p-2.5 text-sm font-semibold"
          style={{
            background: side.startsWith('BUY') ? 'var(--accent-green)' : 'var(--accent-red)',
            color: '#fff',
            cursor: submitting || !symbol || !quantity ? 'not-allowed' : 'pointer',
            opacity: submitting || !symbol || !quantity ? 0.5 : 1,
          }}
        >
          {submitting ? 'Submitting...' : `${side.replace(/_/g, ' ')} ${quantity || '0'} ${symbol.toUpperCase() || ''}`}
        </button>
      </div>
    </div>
  )
}
