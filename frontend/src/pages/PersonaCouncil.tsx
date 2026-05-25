import { useState, useRef, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useToastStore } from '../store/toast'
import { runHedgeFund } from '../api/hedgeFund'
import type { AppNode } from '../components/hedge-flow/types'

interface Persona {
  id: string
  name: string
  style: string
  color: string
  emoji: string
  key: string
}

interface Opinion {
  agent: string
  signal: string
  confidence: number
  reasoning: string
}

const PERSONAS: Persona[] = [
  { id: 'buffett', name: 'Warren Buffett', style: 'Value / Moat', color: '#22c55e', emoji: '🦅', key: 'warren_buffett' },
  { id: 'graham', name: 'Ben Graham', style: 'Deep Value', color: '#3b82f6', emoji: '📘', key: 'ben_graham' },
  { id: 'burry', name: 'Michael Burry', style: 'Contrarian Value', color: '#ef4444', emoji: '👁️', key: 'michael_burry' },
  { id: 'druckenmiller', name: 'Stanley Druckenmiller', style: 'Macro Momentum', color: '#8b5cf6', emoji: '📈', key: 'stanley_druckenmiller' },
  { id: 'taleb', name: 'Nassim Taleb', style: 'Tail Risk', color: '#eab308', emoji: '🛡️', key: 'nassim_taleb' },
  { id: 'lynch', name: 'Peter Lynch', style: 'GARP', color: '#06b6d4', emoji: '🔍', key: 'peter_lynch' },
  { id: 'pabrai', name: 'Mohnish Pabrai', style: 'Clone Strategy', color: '#a855f7', emoji: '🎯', key: 'mohnish_pabrai' },
  { id: 'ackman', name: 'Bill Ackman', style: 'Activist', color: '#ec4899', emoji: '⚡', key: 'bill_ackman' },
  { id: 'wood', name: 'Cathie Wood', style: 'Disruptive Growth', color: '#f97316', emoji: '🚀', key: 'cathie_wood' },
  { id: 'damodaran', name: 'Aswath Damodaran', style: 'Valuation', color: '#14b8a6', emoji: '📊', key: 'aswath_damodaran' },
]

export default function PersonaCouncil() {
  const [ticker, setTicker] = useState('AAPL')
  const [opinions, setOpinions] = useState<Opinion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; abortRef.current?.abort() }
  }, [])

  const runCouncil = useCallback(async () => {
    setLoading(true)
    setOpinions([])
    setError('')
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const reader = await runHedgeFund({
        tickers: [ticker],
        start_date: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),
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
            } catch {}
          }
        }
      }
    } catch (e: unknown) {
      const err = e as Error
      if (err.name !== 'AbortError' && mountedRef.current) {
        setError(err.message)
        addToast('Council deliberation failed', 'error')
      }
    }
    if (mountedRef.current) setLoading(false)
  }, [ticker, addToast])

  const bullish = opinions.filter((o) => o.signal === 'bullish').length
  const bearish = opinions.filter((o) => o.signal === 'bearish').length
  const netScore = opinions.length > 0 ? (bullish - bearish) / opinions.length : 0
  const avgConf = opinions.length > 0 ? opinions.reduce((s, o) => s + o.confidence, 0) / opinions.length : 0
  const consensus = netScore > 0.15 ? 'BULLISH' : netScore < -0.15 ? 'BEARISH' : 'NEUTRAL'
  const consensusColor = netScore > 0.15 ? 'text-up' : netScore < -0.15 ? 'text-down' : 'text-accent-yellow'

  const shareText = opinions.length > 0
    ? `${ticker} Council: ${consensus} (${(Math.abs(netScore) * 100).toFixed(0)}% net, ${(avgConf * 100).toFixed(0)}% confidence)\nBullish: ${bullish} · Bearish: ${bearish}\n${opinions.map((o) => `• ${o.agent}: ${o.signal.toUpperCase()} (${(o.confidence * 100).toFixed(0)}%)`).join('\n')}`
    : ''

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast('Council results copied to clipboard', 'success')
    } catch {
      addToast('Failed to copy', 'error')
    }
  }

  const getPersona = (name: string) => PERSONAS.find((p) => p.name === name)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Persona Council</h1>
          <p className="text-xs font-mono text-muted">
            Legendary investors analyze {ticker || 'a ticker'} and vote
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter ticker..."
            className="w-full px-3 py-2 text-sm font-mono outline-none rounded-sm bg-input border-input text-primary"
            onKeyDown={(e) => e.key === 'Enter' && runCouncil()}
          />
        </div>
        <button
          onClick={runCouncil}
          disabled={loading || !ticker}
          className="px-4 py-2 text-xs font-mono font-bold rounded-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-white border-none"
          style={{
            background: loading ? 'var(--bg-hover)' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            color: loading ? 'var(--text-muted)' : '#fff',
          }}
        >
          {loading ? 'Convening Council...' : 'Convene Council'}
        </button>
      </div>

      {loading && !opinions.length && (
        <div className="flex items-center gap-3 py-4">
          <div className="flex -space-x-2">
            {PERSONAS.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs animate-pulse"
                style={{
                  background: `${p.color}20`,
                  border: `2px solid ${p.color}`,
                  animationDelay: `${i * 0.1}s`,
                  zIndex: 10 - i,
                }}
              >
                {p.emoji}
              </div>
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted">
            {PERSONAS.length} analysts deliberating...
          </span>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 text-[10px] font-mono rounded-sm text-down" style={{ background: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      {opinions.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Card>
              <div className="flex flex-col items-center py-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted">Consensus</span>
                <span className={`text-lg font-bold ${consensusColor}`}>{consensus}</span>
                <span className="text-[9px] font-mono text-muted">{(Math.abs(netScore) * 100).toFixed(0)}% net</span>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col items-center py-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted">Bullish</span>
                <span className="text-lg font-bold text-up">{bullish}</span>
                <span className="text-[9px] font-mono text-muted">of {opinions.length}</span>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col items-center py-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted">Bearish</span>
                <span className="text-lg font-bold text-down">{bearish}</span>
                <span className="text-[9px] font-mono text-muted">of {opinions.length}</span>
              </div>
            </Card>
            <Card>
              <div className="flex flex-col items-center py-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted">Confidence</span>
                <span className="text-lg font-bold text-primary">{(avgConf * 100).toFixed(0)}%</span>
                <span className="text-[9px] font-mono text-muted">average</span>
              </div>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-wider text-muted">
              Council Votes ({opinions.length})
            </span>
            <button
              onClick={handleShare}
              className={`px-2 py-0.5 text-[9px] font-mono cursor-pointer rounded-sm border ${copied ? 'border-up' : 'border-default'}`}
              style={{
                background: copied ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)',
                color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
              }}
            >
              {copied ? 'Copied!' : 'Share Results'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PERSONAS.map((persona) => {
              const opinion = opinions.find((o) => o.agent === persona.name)
              return (
                <div
                  key={persona.id}
                  className="flex items-start gap-3 p-3 rounded-sm bg-card transition-all duration-300"
                  style={{
                    border: `1px solid ${opinion ? `${persona.color}40` : 'var(--border-color)'}`,
                    opacity: opinion ? 1 : 0.4,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${persona.color}20`, border: `2px solid ${persona.color}` }}
                  >
                    {persona.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold whitespace-nowrap text-primary">
                          {persona.name}
                        </span>
                        <span className="text-[9px] font-mono truncate text-muted">
                          {persona.style}
                        </span>
                      </div>
                      {opinion && (
                        <Badge
                          label={`${opinion.signal.toUpperCase()} ${(opinion.confidence * 100).toFixed(0)}%`}
                          variant={opinion.signal === 'bullish' ? 'success' : opinion.signal === 'bearish' ? 'error' : 'warning'}
                          size="sm"
                        />
                      )}
                    </div>
                    {opinion ? (
                      <p className="text-[10px] font-mono mt-1 leading-relaxed text-secondary">
                        {opinion.reasoning || 'No detailed reasoning provided.'}
                      </p>
                    ) : loading ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: persona.color }} />
                        <span className="text-[9px] font-mono text-muted">
                          {opinions.length > 0 ? 'No vote cast' : 'Analyzing...'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-mono mt-1 block text-muted">Waiting for council...</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
