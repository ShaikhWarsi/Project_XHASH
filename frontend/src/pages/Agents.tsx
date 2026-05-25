import { useState, useRef } from 'react'
import Card from '../components/ui/Card'
import { Brain, TrendingUp, Shield, Eye, Percent } from 'lucide-react'

const AGENTS = [
  { id: 'buffett', name: 'Warren Buffett', style: 'Value Investing', color: 'green', icon: Brain, key: 'warren_buffett' },
  { id: 'burry', name: 'Michael Burry', style: 'Deep Value / Contrarian', color: 'red', icon: Eye, key: 'michael_burry' },
  { id: 'druckenmiller', name: 'Stanley Druckenmiller', style: 'Macro / Momentum', color: 'blue', icon: TrendingUp, key: 'stanley_druckenmiller' },
  { id: 'taleb', name: 'Nassim Taleb', style: 'Tail Risk / Antifragility', color: 'yellow', icon: Shield, key: 'nassim_taleb' },
  { id: 'lynch', name: 'Peter Lynch', style: 'Growth at Reasonable Price', color: 'green', icon: Percent, key: 'peter_lynch' },
]

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

export default function Agents() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const [messages, setMessages] = useState<AgentMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

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
          graph_nodes: AGENTS.map((a) => ({
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
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'progress') {
                // status updates, skip for this page
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
                  if (msgs.length > 0) setMessages(msgs)
                }
              } else if (event.type === 'error') {
                setError(event.message || 'Unknown error')
              }
            } catch (err) { console.warn('[Agents] Skipped malformed event:', err) }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message)
      }
    }
    setLoading(false)
  }

  const avgConfidence =
    messages.length > 0
      ? messages.reduce((s, m) => s + m.confidence, 0) / messages.length
      : 0

  const bullishCount = messages.filter((m) => m.signal === 'bullish').length
  const bearishCount = messages.filter((m) => m.signal === 'bearish').length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Council of Legends</h1>
      <p className="text-sm text-[#9aa0a6]">
        AI agents powered by investing legends deliberate and debate trading decisions
      </p>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={selectedTicker}
          onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
          className="w-32 bg-[#2a2d3e] border border-[#3a3d4e] rounded-lg px-3 py-2 text-sm text-white text-center uppercase focus:outline-none focus:border-blue-500"
          placeholder="Ticker"
        />
        <button
          onClick={runAnalysis}
          disabled={loading || !selectedTicker}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Consulting Legends...' : 'Consult Council'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {messages.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card title="Bullish">
            <div className="text-2xl font-bold text-green-400">{bullishCount}/{messages.length}</div>
          </Card>
          <Card title="Bearish">
            <div className="text-2xl font-bold text-red-400">{bearishCount}/{messages.length}</div>
          </Card>
          <Card title="Avg Confidence">
            <div className="text-2xl font-bold text-white">{(avgConfidence * 100).toFixed(0)}%</div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {AGENTS.map((agent) => {
          const msg = messages.find((m) => m.agent === agent.name)
          const Icon = agent.icon
          return (
            <div
              key={agent.id}
              className={`bg-[#1e2235] rounded-xl border border-[#2a2d3e] p-4 transition-all ${
                msg ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    colorMap[agent.color]
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-semibold text-white">{agent.name}</span>
                      <span className="text-xs text-[#9aa0a6] ml-2">{agent.style}</span>
                    </div>
                    {msg && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          msg.signal === 'bullish'
                            ? 'bg-green-500/10 text-green-400'
                            : msg.signal === 'bearish'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {msg.signal.toUpperCase()} {(msg.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {msg ? (
                    <p className="text-sm text-[#c4c7c5] leading-relaxed">{msg.reasoning}</p>
                  ) : loading ? (
                    <div className="flex items-center gap-2 text-sm text-[#5f6368]">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse-glow" />
                      Thinking...
                    </div>
                  ) : (
                    <div className="text-sm text-[#5f6368]">
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
        <Card title="Consensus">
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[#9aa0a6]">Weighted Consensus:</span>
              <span
                className={`font-semibold ${
                  avgConfidence > 0.6 && bullishCount > bearishCount
                    ? 'text-green-400'
                    : avgConfidence > 0.6 && bearishCount > bullishCount
                      ? 'text-red-400'
                      : 'text-yellow-400'
                }`}
              >
                {avgConfidence > 0.6 && bullishCount > bearishCount
                  ? 'BULLISH'
                  : avgConfidence > 0.6 && bearishCount > bullishCount
                    ? 'BEARISH'
                    : 'NEUTRAL'}
              </span>
              ({(avgConfidence * 100).toFixed(0)}% confidence)
            </div>
            <button className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors mr-2">
              Execute Trade
            </button>
            <button className="bg-[#2a2d3e] hover:bg-[#3a3d4e] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Override Decision
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
