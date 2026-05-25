import { useState, useRef, useCallback, useEffect } from 'react'
import Card from '../components/ui/Card'
import { Brain, TrendingUp, Shield, Eye, Percent, User, BarChart3 } from 'lucide-react'
import { runHedgeFund, runHedgeFundBacktest } from '../api/hedgeFund'
import { useToastStore } from '../store/toast'
import PersonaVoteAnimation from '../components/PersonaVoteAnimation'
import type { AppNode } from '../components/hedge-flow/types'

interface Persona {
  id: string
  name: string
  style: string
  color: string
  icon: typeof Brain
  key: string
}

interface Opinion {
  agent: string
  signal: string
  confidence: number
  reasoning: string
}

const PERSONAS: Persona[] = [
  { id: 'buffett', name: 'Warren Buffett', style: 'Value / Moat', color: 'green', icon: Brain, key: 'warren_buffett' },
  { id: 'graham', name: 'Ben Graham', style: 'Deep Value / Margin of Safety', color: 'blue', icon: Shield, key: 'ben_graham' },
  { id: 'burry', name: 'Michael Burry', style: 'Deep Value / Contrarian', color: 'red', icon: Eye, key: 'michael_burry' },
  { id: 'druckenmiller', name: 'Stanley Druckenmiller', style: 'Macro / Momentum', color: 'blue', icon: TrendingUp, key: 'stanley_druckenmiller' },
  { id: 'taleb', name: 'Nassim Taleb', style: 'Tail Risk / Antifragility', color: 'yellow', icon: Shield, key: 'nassim_taleb' },
  { id: 'lynch', name: 'Peter Lynch', style: 'GARP', color: 'green', icon: Percent, key: 'peter_lynch' },
  { id: 'pabrai', name: 'Mohnish Pabrai', style: 'Clone / Asymmetric', color: 'purple', icon: User, key: 'mohnish_pabrai' },
]

const colorMap: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export default function HedgeFund() {
  const [ticker, setTicker] = useState('AFL')
  const [opinions, setOpinions] = useState<Opinion[]>([])
  const [loading, setLoading] = useState(false)
  const [showFlow, setShowFlow] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'deliberate' | 'backtest'>('deliberate')
  const [backtestLog, setBacktestLog] = useState<string[]>([])
  const addToast = useToastStore((s) => s.addToast)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  const runDeliberation = async () => {
    setLoading(true)
    setOpinions([])
    setError('')
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const reader = await runHedgeFund({
        tickers: [ticker],
        start_date: new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        initial_cash: 100000,
        graph_nodes: PERSONAS.map((p) => ({
          id: p.id,
          type: 'agent' as const,
          position: { x: 0, y: 0 },
          data: { label: p.name, agentKey: p.key, description: p.style },
        }) as AppNode),
        graph_edges: [],
        signal: abort.signal,
      })
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'complete') {
                const data = event.data
                if (data?.decisions) {
                  const ops: Opinion[] = []
                  for (const t of Object.keys(data.decisions)) {
                    for (const signal of data.decisions[t] || []) {
                      ops.push({
                        agent: signal.agent_name || signal.agent || 'Unknown',
                        signal: signal.direction === 1 ? 'bullish' : signal.direction === -1 ? 'bearish' : 'neutral',
                        confidence: Math.abs(signal.score || signal.confidence || 0.5),
                        reasoning: signal.reasoning || signal.reason || '',
                      })
                    }
                  }
                  setOpinions(ops)
                }
              } else if (event.type === 'error') {
                setError(event.message || 'Unknown error')
                setLoading(false)
                return
              }
            } catch {
              addToast('Failed to parse hedge fund event', 'error')
            }
          }
        }
      }
    } catch (e: unknown) {
      const err = e as Error
      if (err.name !== 'AbortError' && mountedRef.current) {
        setError(err.message)
        addToast('Hedge fund deliberation failed', 'error')
      }
    }
    if (mountedRef.current) setLoading(false)
  }

  const runBacktest = async () => {
    setLoading(true)
    setBacktestLog([])
    setError('')
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const reader = await runHedgeFundBacktest({
        tickers: [ticker],
        start_date: new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        initial_capital: 100000,
        graph_nodes: PERSONAS.map((p) => ({
          id: p.id,
          type: 'agent' as const,
          position: { x: 0, y: 0 },
          data: { label: p.name, agentKey: p.key, description: p.style },
        }) as AppNode),
        graph_edges: [],
        signal: abort.signal,
      })
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
                setBacktestLog((o) => [...o, `${event.agent}: ${event.status}`])
              } else if (event.type === 'complete') {
                setBacktestLog((o) => [...o, `✓ Backtest complete: ${JSON.stringify(event.data).slice(0, 200)}`])
              } else if (event.type === 'error') {
                setBacktestLog((o) => [...o, `✗ Error: ${event.message}`])
              }
            } catch {
              addToast('Failed to parse backtest event', 'error')
            }
          }
        }
      }
    } catch (e: unknown) {
      const err = e as Error
      if (err.name !== 'AbortError' && mountedRef.current) {
        setError(err.message)
        addToast('Hedge fund backtest failed', 'error')
      }
    }
    if (mountedRef.current) setLoading(false)
  }

  const toggleFlow = useCallback(() => setShowFlow((v) => !v), [])

  const avgConf = opinions.length > 0
    ? opinions.reduce((s, o) => s + o.confidence, 0) / opinions.length
    : 0
  const bullish = opinions.filter((o) => o.signal === 'bullish').length
  const bearish = opinions.filter((o) => o.signal === 'bearish').length
  const netScore = opinions.length > 0 ? (bullish - bearish) / opinions.length : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Hedge Fund Council</h1>
          <p className="text-sm text-[#9aa0a6] mt-0.5">
            {mode === 'deliberate' ? 'Multi-agent deliberation — each persona analyzes and votes' : 'Time-series backtest across historical dates'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setMode('deliberate')}
              className="text-xs px-3 py-1.5 transition-colors"
              style={{
                background: mode === 'deliberate' ? 'var(--accent-blue)' : 'transparent',
                color: mode === 'deliberate' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              Deliberate
            </button>
            <button
              onClick={() => setMode('backtest')}
              className="text-xs px-3 py-1.5 transition-colors"
              style={{
                background: mode === 'backtest' ? 'var(--accent-blue)' : 'transparent',
                color: mode === 'backtest' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              Backtest
            </button>
          </div>
          <button
            onClick={toggleFlow}
            aria-label={showFlow ? 'Hide deliberation flow' : 'Show deliberation flow'}
            className="text-sm text-[#9aa0a6] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            {showFlow ? 'Hide Flow' : 'Show Flow'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          className="w-24 bg-[#2a2d3e] border border-[#3a3d4e] rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
          placeholder="Ticker"
        />
        <button
          onClick={mode === 'deliberate' ? runDeliberation : runBacktest}
          disabled={loading || !ticker}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-all"
        >
          {loading
            ? (mode === 'deliberate' ? 'Deliberating...' : 'Backtesting...')
            : (mode === 'deliberate' ? 'Start Deliberation' : 'Run Backtest')}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {mode === 'deliberate' && (
        <PersonaVoteAnimation opinions={opinions} loading={loading} />
      )}

      {mode === 'backtest' && backtestLog.length > 0 && (
        <Card title="Backtest Log">
          <div className="space-y-1 max-h-60 overflow-y-auto text-sm font-mono">
            {backtestLog.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('✓') ? 'var(--accent-green)' : line.startsWith('✗') ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                {line}
              </div>
            ))}
          </div>
        </Card>
      )}

      {showFlow && (
        <Card title="Deliberation Flow">
          <div className="flex items-center gap-4 py-2 overflow-x-auto">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs text-[#9aa0a6]">Signal Pipeline</span>
            </div>
            <div className="w-6 h-0.5 bg-[#3a3d4e] shrink-0" />
            <div className="flex items-center gap-2 shrink-0">
              {PERSONAS.slice(0, 5).map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorMap[p.color]}`}>
                    <p.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-[#9aa0a6]">{p.name.split(' ')[1]}</span>
                </div>
              ))}
              <div className="text-xs text-[#5f6368] ml-1">+2 more</div>
            </div>
            <div className="w-6 h-0.5 bg-[#3a3d4e] shrink-0" />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-xs text-[#9aa0a6]">Consensus</span>
            </div>
            <div className="w-6 h-0.5 bg-[#3a3d4e] shrink-0" />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-xs text-[#9aa0a6]">Execution</span>
            </div>
          </div>
        </Card>
      )}

      {mode === 'deliberate' && (
        <div className="space-y-2">
          {PERSONAS.map((persona, idx) => {
            const opinion = opinions.find((o) => o.agent === persona.name)
            const Icon = persona.icon
            return (
              <div
                key={persona.id}
                className={`rounded-xl border p-4 transition-all duration-500 ${
                  opinion ? 'opacity-100' : 'opacity-50'
                }`}
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  transitionDelay: opinion ? `${idx * 80}ms` : '0ms',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[persona.color]}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{persona.name}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{persona.style}</span>
                      </div>
                      {opinion && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                          opinion.signal === 'bullish' ? 'bg-green-500/10 text-green-400'
                          : opinion.signal === 'bearish' ? 'bg-red-500/10 text-red-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {opinion.signal.toUpperCase()} {(opinion.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {opinion ? (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <TypewriterText text={opinion.reasoning} speed={15} />
                      </p>
                    ) : loading ? (
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                        Analyzing...
                      </div>
                    ) : (
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Waiting...</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mode === 'deliberate' && opinions.length > 5 && (
        <Card title="Execution Signal">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${
              netScore > 0.15 ? 'text-green-400' : netScore < -0.15 ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {netScore > 0.15 ? '▲ BULLISH' : netScore < -0.15 ? '▼ BEARISH' : '◆ NEUTRAL'}
            </span>
            <span className="text-xs text-[#9aa0a6]">
              {(bullish - bearish)}/{opinions.length} net · {(avgConf * 100).toFixed(0)}% avg confidence
            </span>
            <button className="ml-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              Execute
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

function WalletIcon(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h14a2 2 0 002-2v-4" />
    </svg>
  )
}

function TypewriterText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    indexRef.current = 0
    setDisplayed('')
    setDone(false)
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        setDone(true)
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse text-blue-400">▌</span>}
    </span>
  )
}
