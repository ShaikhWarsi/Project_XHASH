import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Users, Radio, UserPlus } from 'lucide-react'

interface SignalMessage {
  id: string
  from: string
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  price: number
  timestamp: string
  message: string
}

interface Trader {
  id: string
  name: string
  status: 'online' | 'offline'
  followers: number
  winRate: number
}

const DEMO_TRADERS: Trader[] = [
  { id: 't1', name: 'AlphaTrader', status: 'online', followers: 1243, winRate: 68 },
  { id: 't2', name: 'QuantKing', status: 'online', followers: 892, winRate: 72 },
  { id: 't3', name: 'TrendFollower', status: 'offline', followers: 456, winRate: 61 },
  { id: 't4', name: 'OptionsMaster', status: 'online', followers: 2107, winRate: 75 },
]

const DEMO_SIGNALS: SignalMessage[] = [
  { id: 's1', from: 'AlphaTrader', symbol: 'AAPL', action: 'BUY', quantity: 100, price: 178.50, timestamp: '09:32:15', message: 'Strong support at 175, breakout above 180 imminent' },
  { id: 's2', from: 'QuantKing', symbol: 'MSFT', action: 'SELL', quantity: 50, price: 420.30, timestamp: '09:28:44', message: 'RSI overbought, taking profits' },
  { id: 's3', from: 'OptionsMaster', symbol: 'TSLA', action: 'BUY', quantity: 200, price: 245.80, timestamp: '09:15:22', message: 'Bull flag on 15-min, targeting 260' },
  { id: 's4', from: 'AlphaTrader', symbol: 'NVDA', action: 'BUY', quantity: 50, price: 890.20, timestamp: '08:55:00', message: 'Earnings beat, pre-market gap up' },
  { id: 's5', from: 'QuantKing', symbol: 'SPY', action: 'SELL', quantity: 500, price: 543.10, timestamp: '08:30:30', message: 'VXN spike suggests hedging' },
]

export default function SocialTrading() {
  const [signals, setSignals] = useState<SignalMessage[]>(DEMO_SIGNALS)
  const [message, setMessage] = useState('')
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [connected, setConnected] = useState(false)
  const [wsStatus, setWsStatus] = useState('Disconnected')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/signals`
    try {
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => { setConnected(true); setWsStatus('Connected') }
      ws.onclose = () => { setConnected(false); setWsStatus('Disconnected') }
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'signal') {
            setSignals((prev) => [{ ...msg.data, id: `s-${Date.now()}` }, ...prev].slice(0, 50))
          }
        } catch {}
      }
      wsRef.current = ws
      return () => ws.close()
    } catch {
      setWsStatus('Unavailable')
    }
  }, [])

  const sendSignal = useCallback(() => {
    if (!symbol || !quantity) return
    const newSignal: SignalMessage = {
      id: `s-${Date.now()}`,
      from: 'You',
      symbol: symbol.toUpperCase(),
      action,
      quantity: Number(quantity),
      price: Number(price) || 0,
      timestamp: new Date().toLocaleTimeString(),
      message,
    }
    setSignals((prev) => [newSignal, ...prev])
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'signal', data: newSignal }))
    }
    setMessage('')
    setPrice('')
  }, [symbol, action, quantity, price, message])

  return (
    <div className="flex h-full gap-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 py-1">
          <span className="text-[11px] font-bold" style={{ color: 'var(--accent-green)' }}>SOCIAL TRADING</span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: connected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            <Radio size={10} /> {wsStatus}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {DEMO_TRADERS.map((trader) => (
            <div key={trader.id} className="bg-card border border-default rounded px-2 py-1.5 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: trader.status === 'online' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{trader.name}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 9 }}>{trader.followers} followers · {trader.winRate}% win</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 px-2 py-1.5 bg-card border border-default rounded text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" className="bg-card border border-default" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '1px 4px', outline: 'none', width: 70 }} />
          <select value={action} onChange={(e) => setAction(e.target.value as any)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '1px 4px', outline: 'none', width: 65 }}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '1px 4px', outline: 'none', width: 60 }} />
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" step="0.01" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '1px 4px', outline: 'none', width: 70 }} />
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message (optional)" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '1px 4px', outline: 'none', flex: 1, minWidth: 60 }} />
          <button onClick={sendSignal} disabled={!symbol || !quantity}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--accent-cyan)', border: 'none', color: '#000',
              fontWeight: 600, padding: '2px 8px',
              cursor: symbol && quantity ? 'pointer' : 'not-allowed',
              opacity: symbol && quantity ? 1 : 0.5,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, borderRadius: 2,
            }}>
            <Send size={12} /> SIGNAL
          </button>
        </div>

        <div className="flex-1 overflow-auto flex flex-col gap-1">
          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>LIVE SIGNALS ({signals.length})</span>
          {signals.map((s) => (
            <div key={s.id} className="bg-card border border-default rounded px-2 py-1.5 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.from}</span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span className="font-semibold" style={{ color: 'var(--accent-blue)' }}>{s.symbol}</span>
                <span className="font-bold" style={{ color: s.action === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{s.action}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{s.quantity} shares</span>
                {s.price > 0 && <span style={{ color: 'var(--text-muted)' }}>@ ${s.price.toFixed(2)}</span>}
                <span className="flex-1" />
                <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{s.timestamp}</span>
              </div>
              {s.message && <div style={{ color: 'var(--text-secondary)', marginTop: 1, fontSize: 9 }}>{s.message}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="w-50 border-l border-default pl-1.5 flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase flex items-center gap-1" style={{ color: 'var(--accent-green)' }}>
          <Users size={12} />
          FOLLOWING
        </span>
        {DEMO_TRADERS.map((trader) => (
          <div key={trader.id} className="flex items-center gap-1.5 px-1.5 py-1 bg-card border border-default rounded text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: trader.status === 'online' ? '#22c55e' : 'var(--text-muted)' }} />
            <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{trader.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>{trader.followers}</span>
          </div>
        ))}
        <button className="flex items-center gap-1 bg-card border border-default" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '4px 6px', cursor: 'pointer', borderRadius: 2 }}>
          <UserPlus size={10} /> FIND TRADERS
        </button>
      </div>
    </div>
  )
}
