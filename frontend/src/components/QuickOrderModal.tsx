import { useState, useEffect, useRef } from 'react'
import { X, Send, TrendingUp, TrendingDown, Zap, ShieldCheck } from 'lucide-react'
import { placeOrder } from '../api/client'
import { useToastStore } from '../store/toast'
import { useAudio } from '../contexts/AudioAlertContext'

interface QuickOrderModalProps {
  isOpen: boolean
  onClose: () => void
  initialSymbol?: string
  initialSide?: 'BUY' | 'SELL'
}

const QUICK_SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'SPY', 'QQQ', 'BTC-USD', 'ETH-USD']

export default function QuickOrderModal({
  isOpen,
  onClose,
  initialSymbol = 'AAPL',
  initialSide = 'BUY',
}: QuickOrderModalProps) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide)
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET')
  const [quantity, setQuantity] = useState<number>(10)
  const [price, setPrice] = useState<number>(150)
  const [stopLoss, setStopLoss] = useState<string>('')
  const [takeProfit, setTakeProfit] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isBracket, setIsBracket] = useState(false)

  const addToast = useToastStore((s) => s.addToast)
  const { playSuccess, playError } = useAudio()
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol)
    if (initialSide) setSide(initialSide)
  }, [initialSymbol, initialSide, isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol || quantity <= 0) {
      addToast('Please enter a valid symbol and quantity', 'error')
      return
    }

    setLoading(true)
    try {
      const orderPayload: any = {
        symbol: symbol.toUpperCase(),
        side: side,
        order_type: orderType,
        quantity: Number(quantity),
        price: orderType === 'MARKET' ? undefined : Number(price),
      }

      if (isBracket) {
        if (stopLoss) orderPayload.stop_loss = Number(stopLoss)
        if (takeProfit) orderPayload.take_profit = Number(takeProfit)
      }

      await placeOrder(orderPayload)
      playSuccess()
      addToast(`Executed ${side} ${quantity} ${symbol.toUpperCase()} (${orderType})`, 'success')
      onClose()
    } catch (err: any) {
      playError()
      addToast(err?.response?.data?.detail || err?.message || 'Order submission failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const estNotional = (orderType === 'MARKET' ? 150 : price) * quantity

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-card border border-default rounded-lg shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-secondary border-b border-default">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent-cyan" />
            <span className="font-bold text-primary tracking-wide">QUICK ORDER TICKET</span>
            <span className="text-[10px] text-muted px-1.5 py-0.5 bg-primary rounded border border-default">
              Alt+O
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors p-1 rounded cursor-pointer"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Quick Tickers Bar */}
        <div className="flex items-center gap-1 px-4 py-1.5 bg-primary/50 border-b border-default overflow-x-auto scrollbar-none">
          <span className="text-[9px] text-muted uppercase tracking-wider shrink-0 mr-1">Quick:</span>
          {QUICK_SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSymbol(s)}
              className={`px-1.5 py-0.5 text-[10px] rounded cursor-pointer transition-colors ${
                symbol === s ? 'bg-accent-cyan text-black font-bold' : 'text-secondary hover:text-primary bg-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          {/* Side Selector (BUY / SELL) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-2 px-3 flex items-center justify-center gap-1.5 rounded font-bold cursor-pointer transition-all ${
                side === 'BUY'
                  ? 'bg-accent-green text-black shadow-md shadow-accent-green/20'
                  : 'bg-secondary text-muted hover:text-primary border border-default'
              }`}
            >
              <TrendingUp size={14} />
              BUY (LONG)
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-2 px-3 flex items-center justify-center gap-1.5 rounded font-bold cursor-pointer transition-all ${
                side === 'SELL'
                  ? 'bg-accent-red text-white shadow-md shadow-accent-red/20'
                  : 'bg-secondary text-muted hover:text-primary border border-default'
              }`}
            >
              <TrendingDown size={14} />
              SELL (SHORT)
            </button>
          </div>

          {/* Symbol & Order Type */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full bg-input border border-input rounded px-2.5 py-1.5 text-primary uppercase font-bold focus:outline-hidden focus:border-accent-cyan"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full bg-input border border-input rounded px-2.5 py-1.5 text-primary focus:outline-hidden focus:border-accent-cyan"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
              </select>
            </div>
          </div>

          {/* Quantity & Limit Price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-input border border-input rounded px-2.5 py-1.5 text-primary tabular-nums focus:outline-hidden focus:border-accent-cyan"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted uppercase tracking-wider mb-1">
                {orderType === 'MARKET' ? 'Est. Price' : 'Limit Price'}
              </label>
              <input
                type="number"
                step="any"
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? 150 : price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-input border border-input rounded px-2.5 py-1.5 text-primary tabular-nums disabled:opacity-50 focus:outline-hidden focus:border-accent-cyan"
              />
            </div>
          </div>

          {/* Bracket Toggle */}
          <div className="border-t border-default pt-2.5">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-wider cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBracket}
                  onChange={(e) => setIsBracket(e.target.checked)}
                  className="rounded border-input text-accent-cyan focus:ring-0"
                />
                <ShieldCheck size={12} className={isBracket ? 'text-accent-cyan' : 'text-muted'} />
                Attach TP / SL Bracket
              </label>
            </div>

            {isBracket && (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-100">
                <div>
                  <label className="block text-[9px] text-up uppercase tracking-wider mb-0.5">Take Profit ($)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 165"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full bg-input border border-input rounded px-2 py-1 text-primary text-[11px] tabular-nums focus:outline-hidden focus:border-accent-cyan"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-down uppercase tracking-wider mb-0.5">Stop Loss ($)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 142"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full bg-input border border-input rounded px-2 py-1 text-primary text-[11px] tabular-nums focus:outline-hidden focus:border-accent-cyan"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Order Summary & Submit Button */}
          <div className="pt-2 border-t border-default flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[10px] text-muted font-mono-data">
              <span>Est. Notional:</span>
              <span className="text-primary font-bold tabular-nums">${estNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 rounded font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                side === 'BUY'
                  ? 'bg-accent-green hover:bg-accent-green/90 text-black shadow-lg shadow-accent-green/20'
                  : 'bg-accent-red hover:bg-accent-red/90 text-white shadow-lg shadow-accent-red/20'
              } disabled:opacity-50`}
            >
              <Send size={13} />
              {loading ? 'SUBMITTING...' : `CONFIRM ${side} ORDER`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
