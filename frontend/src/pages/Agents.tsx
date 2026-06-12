import { useState, useRef, useEffect } from 'react'
import Card from '../components/ui/Card'
import { Brain, TrendingUp, Shield, Eye, Percent } from 'lucide-react'
import { useToastStore } from '../store/toast'
import { usePersonas } from '../hooks/usePersonas'
import { api, placeOrder, fetchRiskMetrics, fetchPositions } from '../api/client'
import ConfirmOrderModal from '../components/ui/ConfirmOrderModal'
import { pushLog } from '../components/LastActionLog'

const colorMap: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

interface AgentMsg {
  agent: string
  signal: string
  confidence: number
  reasoning: string
}

function agentIcon(style: string) {
  const s = style.toLowerCase()
  if (s.includes('value') || s.includes('moat')) return Shield
  if (s.includes('momentum') || s.includes('growth') || s.includes('macro')) return TrendingUp
  if (s.includes('contrarian') || s.includes('deep') || s.includes('risk')) return Eye
  if (s.includes('quant') || s.includes('arb')) return Percent
  return Brain
}

const DEFAULT_AGENTS = [
  { id: 'buffett', name: 'Warren Buffett', style: 'Value Investing', color: 'green', icon: Brain, key: 'warren_buffett' },
  { id: 'burry', name: 'Michael Burry', style: 'Deep Value / Contrarian', color: 'red', icon: Eye, key: 'michael_burry' },
  { id: 'druckenmiller', name: 'Stanley Druckenmiller', style: 'Macro / Momentum', color: 'blue', icon: TrendingUp, key: 'stanley_druckenmiller' },
  { id: 'taleb', name: 'Nassim Taleb', style: 'Tail Risk / Antifragility', color: 'yellow', icon: Shield, key: 'nassim_taleb' },
  { id: 'lynch', name: 'Peter Lynch', style: 'Growth at Reasonable Price', color: 'green', icon: Percent, key: 'peter_lynch' },
]

export default function Agents() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const [messages, setMessages] = useState<AgentMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const addToast = useToastStore((s) => s.addToast)
  const abortRef = useRef<AbortController | null>(null)

  const { personas: apiPersonas } = usePersonas()
  const agents = apiPersonas.length > 0
    ? apiPersonas.map((p) => ({ ...p, icon: agentIcon(p.style) }))
    : DEFAULT_AGENTS

  const runAnalysis = async () => {
    setLoading(true)
    setMessages([])
    setError('')
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/hedge-fund/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          tickers: [selectedTicker],
          start_date: new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
          end_date: new Date().toISOString().slice(0, 10),
          initial_cash: 100000,
          graph_nodes: agents.map((a) => ({
            id: a.id,
            type: 'agent',
            position: { x: 0, y: 0 },
            data: { agent_key: a.key },
          })),
          graph_edges: [],
        }),
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const block of parts) {
          const dataLines = block.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6))
          if (dataLines.length === 0) continue
          try {
            const event = JSON.parse(dataLines.join(''))
            if (event.type === 'progress') {
            } else if (event.type === 'complete') {
              const data = event.data
              if (data?.decisions) {
                const msgs: AgentMsg[] = []
                for (const ticker of Object.keys(data.decisions)) {
                  for (const signal of data.decisions[ticker] || []) {
                    msgs.push({
                      agent: signal.agent_name || signal.agent || 'Unknown',
                      signal: signal.direction === 1 ? 'bullish' : signal.direction === -1 ? 'bearish' : 'neutral',
                      confidence: Math.abs(signal.score || signal.confidence || 0.5),
                      reasoning: signal.reasoning || signal.reason || '',
                    })
                  }
                }
                if (msgs.length > 0) {
                  setMessages(msgs)
                  pushLog('AGENT DELIBERATION', `${msgs.length} signals for ${selectedTicker}`, 'signal')
                }
              }
            } else if (event.type === 'error') {
              setError(event.message || 'Unknown error')
            }
          } catch (err) { console.warn('[Agents] Skipped malformed event:', err) }
        }
      }
      if (buffer.startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.replace(/^data: /, ''))
          if (event.type === 'complete' && event.data?.decisions) {
            const msgs: AgentMsg[] = []
            for (const ticker of Object.keys(event.data.decisions)) {
              for (const signal of event.data.decisions[ticker] || []) {
                msgs.push({
                  agent: signal.agent_name || signal.agent || 'Unknown',
                  signal: signal.direction === 1 ? 'bullish' : signal.direction === -1 ? 'bearish' : 'neutral',
                  confidence: Math.abs(signal.score || signal.confidence || 0.5),
                  reasoning: signal.reasoning || signal.reason || '',
                })
              }
            }
            if (msgs.length > 0) setMessages(msgs)
          }
        } catch (parseErr) { console.warn('[Agents] Failed to parse trailing buffer:', parseErr) }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message)
      }
    }
    setLoading(false)
  }

  const [confirmOrder, setConfirmOrder] = useState<{ side: string; qty: number; price: number } | null>(null)

  const llmCost = messages.length > 0
    ? ((messages.reduce((s, m) => s + m.reasoning.length, 0) / 4) * 0.00003 + messages.length * 0.002).toFixed(4)
    : '0.0000'

  const avgConfidence = messages.length > 0
    ? (messages.reduce((s, m) => s + m.confidence, 0) / messages.length)
    : 0

  const bullishCount = messages.filter((m) => m.signal === 'bullish').length

  const bearishCount = messages.filter((m) => m.signal === 'bearish').length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Strategy Agents</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Multi-agent deliberation system — each agent analyzes from a distinct investment philosophy
      </p>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={selectedTicker}
          onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
          className="w-32 px-3 py-2 text-sm text-center uppercase rounded-lg focus:outline-none"
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--text-primary)',
          }}
          placeholder="Ticker"
        />
        <button
          onClick={runAnalysis}
          disabled={loading || !selectedTicker}
          className="text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          style={{
            background: 'var(--accent-blue)',
            opacity: loading || !selectedTicker ? 0.5 : 1,
            cursor: loading || !selectedTicker ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2 text-sm" style={{ background: 'color-mix(in srgb, var(--accent-red) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-red) 20%, transparent)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {messages.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card title="Bullish">
            <div className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>{bullishCount}/{messages.length}</div>
            <div style={{ width: '100%', height: 4, background: 'var(--bg-hover)', borderRadius: 2, marginTop: 4 }}>
              <div style={{ width: `${(bullishCount / messages.length) * 100}%`, height: 4, background: 'var(--accent-green)', borderRadius: 2 }} />
            </div>
          </Card>
          <Card title="Bearish">
            <div className="text-2xl font-bold" style={{ color: 'var(--accent-red)' }}>{bearishCount}/{messages.length}</div>
            <div style={{ width: '100%', height: 4, background: 'var(--bg-hover)', borderRadius: 2, marginTop: 4 }}>
              <div style={{ width: `${(bearishCount / messages.length) * 100}%`, height: 4, background: 'var(--accent-red)', borderRadius: 2 }} />
            </div>
          </Card>
          <Card title="Avg Confidence">
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(avgConfidence * 100).toFixed(0)}%</div>
            <div style={{ width: '100%', height: 4, background: 'var(--bg-hover)', borderRadius: 2, marginTop: 4 }}>
              <div style={{ width: `${avgConfidence * 100}%`, height: 4, background: 'var(--accent-blue)', borderRadius: 2 }} />
            </div>
          </Card>
          <Card title="Consensus">
            <div
              className="text-lg font-bold"
              style={{
                color: avgConfidence > 0.6 && bullishCount > bearishCount
                  ? 'var(--accent-green)'
                  : avgConfidence > 0.6 && bearishCount > bullishCount
                    ? 'var(--accent-red)'
                    : 'var(--accent-yellow)',
              }}
            >
              {avgConfidence > 0.6 && bullishCount > bearishCount
                ? 'BULLISH'
                : avgConfidence > 0.6 && bearishCount > bullishCount
                  ? 'BEARISH'
                  : 'NEUTRAL'}
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {agents.map((agent) => {
          const msg = messages.find((m) => m.agent === agent.name)
          const Icon = agent.icon
          return (
            <div
              key={agent.id}
              className="rounded-xl p-4 transition-all"
              style={{
                background: msg ? 'var(--bg-card)' : 'var(--bg-secondary)',
                border: `1px solid ${msg ? 'var(--border-color)' : 'var(--border-color)'}`,
                opacity: msg ? 1 : 0.5,
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    colorMap[agent.color]
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{agent.name}</span>
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{agent.style}</span>
                    </div>
                    {msg && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded shrink-0"
                        style={{
                          background: msg.signal === 'bullish'
                            ? 'color-mix(in srgb, var(--accent-green) 15%, transparent)'
                            : msg.signal === 'bearish'
                              ? 'color-mix(in srgb, var(--accent-red) 15%, transparent)'
                              : 'color-mix(in srgb, var(--accent-yellow) 15%, transparent)',
                          color: msg.signal === 'bullish'
                            ? 'var(--accent-green)'
                            : msg.signal === 'bearish'
                              ? 'var(--accent-red)'
                              : 'var(--accent-yellow)',
                        }}
                      >
                        {msg.signal.toUpperCase()} {(msg.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {msg && (
                    <div style={{ width: '100%', height: 3, background: 'var(--bg-hover)', borderRadius: 2, marginBottom: 4 }}>
                      <div style={{
                        width: `${msg.confidence * 100}%`,
                        height: 3,
                        background: msg.signal === 'bullish' ? 'var(--accent-green)' : msg.signal === 'bearish' ? 'var(--accent-red)' : 'var(--accent-yellow)',
                        borderRadius: 2,
                      }} />
                    </div>
                  )}
                  {msg ? (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{msg.reasoning}</p>
                  ) : loading ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: 'var(--accent-blue)' }} />
                      Analyzing...
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Waiting for analysis...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {messages.length > 0 && (
        <Card title="Trading Decision">
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: 'var(--text-secondary)' }}>Weighted Consensus:</span>
              <span
                className="font-semibold"
                style={{
                  color: avgConfidence > 0.6 && bullishCount > bearishCount
                    ? 'var(--accent-green)'
                    : avgConfidence > 0.6 && bearishCount > bullishCount
                      ? 'var(--accent-red)'
                      : 'var(--accent-yellow)',
                }}
              >
                {avgConfidence > 0.6 && bullishCount > bearishCount
                  ? 'BULLISH'
                  : avgConfidence > 0.6 && bearishCount > bullishCount
                    ? 'BEARISH'
                    : 'NEUTRAL'}
              </span>
              ({(avgConfidence * 100).toFixed(0)}% confidence)
              <span className="font-mono-data text-[9px] text-muted ml-2">
                | {messages.length} agents · ~${llmCost} LLM cost
              </span>
            </div>
            <button
              onClick={async () => {
                try {
                  const risk = await fetchRiskMetrics()
                  const positions = await fetchPositions()
                  const existing = positions.find((p) => p.symbol === selectedTicker)
                  const maxPosition = Math.max(10, Math.floor((risk.buyingPower || 50000) * 0.1 / 100))
                  const maxQty = Math.min(10, maxPosition)
                  const side = bullishCount > bearishCount ? 'BUY' : 'SELL'
                  const price = 0
                  const totalValue = price * maxQty || maxQty * 100
                  if (risk.buyingPower && totalValue > risk.buyingPower) {
                    addToast(`Insufficient buying power: need $${totalValue.toFixed(0)}, have $${risk.buyingPower.toFixed(0)}`, 'error'); return
                  }
                  const portfolioValue = (await fetchPositions()).reduce((s: number, p: any) => s + (p.market_value || 0), 0) + (risk.cashAvailable || 0)
                  if (portfolioValue > 0 && totalValue > portfolioValue * 0.01) {
                    setConfirmOrder({ side, qty: maxQty, price: price || 100 }); return
                  }
                  await placeOrder({ symbol: selectedTicker, side, quantity: maxQty, orderType: 'MARKET', reduceOnly: existing ? existing.side !== (side === 'BUY' ? 'LONG' : 'SHORT') : false })
                  addToast(`${side} ${maxQty} ${selectedTicker} placed`, 'success')
                  pushLog(`${side} ${selectedTicker}`, `${maxQty} shares at market`, 'trade')
                } catch (e: any) {
                  addToast(`Trade failed: ${e.message}`, 'error')
                }
              }}
              className="text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors mr-2"
              style={{ background: 'var(--accent-green)', border: 'none', cursor: 'pointer' }}
            >
              Execute Trade
            </button>
            <button
              onClick={async () => {
                const override = prompt('Override signal (BUY/SELL/HOLD):', bullishCount > bearishCount ? 'BUY' : 'SELL')
                if (!override) return
                try {
                  const risk = await fetchRiskMetrics()
                  const positions = await fetchPositions()
                  const existing = positions.find((p) => p.symbol === selectedTicker)
                  const maxPosition = Math.max(10, Math.floor((risk.buyingPower || 50000) * 0.1 / 100))
                  const maxQty = Math.min(10, maxPosition)
                  const price = 0
                  const totalValue = price * maxQty || maxQty * 100
                  if (risk.buyingPower && totalValue > risk.buyingPower) {
                    addToast(`Insufficient buying power: need $${totalValue.toFixed(0)}, have $${risk.buyingPower.toFixed(0)}`, 'error'); return
                  }
                  await placeOrder({ symbol: selectedTicker, side: override as 'BUY' | 'SELL', quantity: maxQty, orderType: 'MARKET', reduceOnly: existing ? existing.side !== (override === 'BUY' ? 'LONG' : 'SHORT') : false })
                  addToast(`Override: ${override} ${maxQty} ${selectedTicker} placed`, 'success')
                  pushLog(`OVERRIDE ${override} ${selectedTicker}`, `${maxQty} shares at market`, 'trade')
                } catch (e: any) {
                  addToast(`Override trade failed: ${e.message}`, 'error')
                }
              }}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Override Decision
            </button>
            {confirmOrder && (
              <ConfirmOrderModal
                symbol={selectedTicker}
                side={confirmOrder.side}
                quantity={confirmOrder.qty}
                price={confirmOrder.price}
                totalValue={confirmOrder.qty * confirmOrder.price}
                portfolioValue={0}
                buyingPower={200000}
                onConfirm={async () => {
                  setConfirmOrder(null)
                  try {
                    await placeOrder({ symbol: selectedTicker, side: confirmOrder.side as 'BUY' | 'SELL', quantity: confirmOrder.qty, orderType: 'MARKET' })
                    addToast(`${confirmOrder.side} ${confirmOrder.qty} ${selectedTicker} placed`, 'success')
                    pushLog(`${confirmOrder.side} ${selectedTicker}`, `${confirmOrder.qty} shares confirmed`, 'trade')
                  } catch (e: any) { addToast(`Trade failed: ${e.message}`, 'error') }
                }}
                onCancel={() => setConfirmOrder(null)}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
