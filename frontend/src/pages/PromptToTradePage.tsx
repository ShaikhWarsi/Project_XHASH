import { useState } from 'react'
import Breadcrumbs from '../components/Breadcrumbs'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { api } from '../api/client'
import { useToastStore } from '../store/toast'

interface ParsedOrder {
  action: 'BUY' | 'SELL' | 'SHORT' | 'COVER'
  symbol: string
  qty: number
  orderType: 'MKT' | 'LMT' | 'STP' | 'STP_LMT'
  price?: number
  stopPrice?: number
  condition?: string
  tif: 'DAY' | 'GTC' | 'IOC' | 'FOK'
}

const EXAMPLES = [
  'Buy 100 shares of AAPL at $198, stop at $192',
  'Sell 50 SPY if RSI < 30',
  'Short 200 TSLA at market, target $220',
  'Buy 500 AMD limit $145, GTC',
  'Sell 300 MSFT if price > $425 and volume > 20M',
]

function parseOrder(text: string): ParsedOrder | null {
  const upper = text.toUpperCase()

  let action: ParsedOrder['action'] | null = null
  if (upper.includes('BUY TO COVER') || upper.includes('COVER')) action = 'COVER'
  else if (upper.includes('SELL SHORT') || upper.includes('SHORT')) action = 'SHORT'
  else if (upper.includes('BUY')) action = 'BUY'
  else if (upper.includes('SELL')) action = 'SELL'
  if (!action) return null

  const symMatch = upper.match(/\b[A-Z]{1,5}\b/g)
  if (!symMatch) return null
  let symbol = ''
  for (const w of symMatch) {
    if (!['BUY', 'SELL', 'SHORT', 'COVER', 'AT', 'OF', 'IF', 'STOP', 'LIMIT', 'SHARES', 'MARKET', 'GTC', 'IOC', 'FOK', 'DAY', 'AND', 'OR'].includes(w)) {
      symbol = w; break
    }
  }
  if (!symbol) return null

  const qtyMatch = text.match(/(\d+)\s*(?:SHARES|CONTRACTS|QTY)?/i)
  const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0

  let price: number | undefined
  let stopPrice: number | undefined
  let orderType: ParsedOrder['orderType'] = 'MKT'

  const limMatch = text.match(/(?:AT|LIMIT)\s*\$?(\d+\.?\d*)/i)
  if (limMatch) { price = parseFloat(limMatch[1]); orderType = 'LMT' }

  const stopMatch = text.match(/(?:STOP|STOP LOSS)\s*(?:AT\s*)?\$?(\d+\.?\d*)/i)
  if (stopMatch) { stopPrice = parseFloat(stopMatch[1]); orderType = orderType === 'LMT' ? 'STP_LMT' : 'STP' }

  if (upper.includes('MARKET')) orderType = 'MKT'

  let condition: string | undefined
  const ifMatch = text.match(/(?:IF|WHEN)\s+(.+?)(?:,|\.|$)/i)
  if (ifMatch && !ifMatch[1].toUpperCase().includes('RSI')) condition = ifMatch[1].trim()

  let tif: ParsedOrder['tif'] = 'DAY'
  if (upper.includes('GTC')) tif = 'GTC'
  else if (upper.includes('IOC')) tif = 'IOC'
  else if (upper.includes('FOK')) tif = 'FOK'

  return { action, symbol, qty: qty || 100, orderType, price, stopPrice, condition, tif }
}

export default function PromptToTradePage() {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedOrder | null>(null)
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const addToast = useToastStore((s) => s.addToast)

  const handleParse = () => {
    if (!input.trim()) return
    const result = parseOrder(input)
    setParsed(result)
    if (!result) addToast('Could not parse order. Try: "Buy 100 AAPL at $198"', 'error')
  }

  const handleSubmit = async () => {
    if (!parsed) return
    setSending(true)
    try {
      const payload: any = {
        symbol: parsed.symbol,
        side: parsed.action,
        quantity: parsed.qty,
        order_type: parsed.orderType.toLowerCase(),
        time_in_force: parsed.tif,
      }
      if (parsed.price) payload.price = parsed.price
      if (parsed.stopPrice) payload.stop_price = parsed.stopPrice
      await api.post('/orders', payload)
      addToast(`${parsed.action} ${parsed.qty} ${parsed.symbol} submitted`, 'success')
      setHistory((prev) => [`${parsed.action} ${parsed.qty} ${parsed.symbol} @ ${parsed.price ? `$${parsed.price}` : 'MKT'}`, ...prev].slice(0, 20))
      setParsed(null)
      setInput('')
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Order failed', 'error')
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Breadcrumbs />
      <Card title="PROMPT TO TRADE" actions={<Badge label="NATURAL LANGUAGE" variant="info" size="sm" />}>
        <div className="flex flex-col gap-1.5 font-mono-data text-[10px]">
          <div className="flex gap-1">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleParse() }}
              placeholder="Buy 100 AAPL at $198, stop at $192"
              className="flex-1 bg-input border border-input text-primary px-2 py-1.5 outline-none rounded-sm text-[11px]"
            />
            <button onClick={handleParse}
              className="px-3 py-1 cursor-pointer border-none rounded-sm text-white text-[10px] font-semibold"
              style={{ background: 'var(--accent-cyan)' }}>
              PARSE
            </button>
          </div>
          <div className="flex flex-wrap gap-1 text-[9px] text-muted">
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setInput(ex)}
                className="bg-transparent border-none text-[9px] cursor-pointer px-1 py-0.5 rounded-sm"
                style={{ color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.08)' }}>
                {ex}
              </button>
            ))}
          </div>
          {parsed && (
            <div className="rounded-sm p-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
              <div className="text-[9px] text-muted mb-1 font-semibold">PARSED ORDER:</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <div><span className="text-muted">Action: </span><span style={{ color: parsed.action === 'BUY' || parsed.action === 'COVER' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{parsed.action}</span></div>
                <div><span className="text-muted">Symbol: </span><span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{parsed.symbol}</span></div>
                <div><span className="text-muted">Qty: </span><span className="text-primary">{parsed.qty}</span></div>
                <div><span className="text-muted">Type: </span><span className="text-primary">{parsed.orderType}</span></div>
                {parsed.price && <div><span className="text-muted">Price: </span><span className="text-primary">${parsed.price.toFixed(2)}</span></div>}
                {parsed.stopPrice && <div><span className="text-muted">Stop: </span><span style={{ color: 'var(--accent-red)' }}>${parsed.stopPrice.toFixed(2)}</span></div>}
                <div><span className="text-muted">TIF: </span><span className="text-primary">{parsed.tif}</span></div>
              </div>
              {parsed.condition && <div className="mt-1 text-[9px]"><span className="text-muted">Condition: </span><span style={{ color: 'var(--accent-yellow)' }}>{parsed.condition}</span></div>}
              <div className="flex gap-1 mt-2">
                <button onClick={handleSubmit} disabled={sending}
                  className="px-3 py-1 text-[10px] font-semibold cursor-pointer border-none rounded-sm"
                  style={{ background: 'rgba(34,197,94,0.2)', color: 'var(--accent-green)', opacity: sending ? 0.6 : 1 }}>
                  {sending ? 'SUBMITTING...' : 'SUBMIT ORDER'}
                </button>
                <button onClick={() => setParsed(null)}
                  className="px-3 py-1 text-[10px] cursor-pointer border-none rounded-sm"
                  style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>
                  CANCEL
                </button>
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div>
              <div className="text-[9px] text-muted font-semibold mb-1">RECENT ORDERS</div>
              <div className="space-y-0.5">
                {history.map((h, i) => (
                  <div key={i} className="text-[9px] text-primary border-b border-default pb-0.5">{h}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
