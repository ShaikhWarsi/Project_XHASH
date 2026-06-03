import { useState, useRef, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useToastStore } from '../store/toast'
import { runHedgeFund } from '../api/hedgeFund'
import { usePersonas } from '../hooks/usePersonas'
import type { AppNode } from '../components/hedge-flow/types'

const EMOJI_MAP: Record<string, string> = {
  buffett: '🦅', graham: '📘', burry: '👁️', druckenmiller: '📈',
  taleb: '🛡️', lynch: '🔍', pabrai: '🎯', ackman: '⚡',
  wood: '🚀', damodaran: '📊', soros: '🌍', dalio: '🔄',
  simons: '🧮', marks: '📝', cohen: '🎮', loeb: '⚔️',
}

const COLOR_HEX_MAP: Record<string, string> = {
  green: '#22c55e', red: '#ef4444', blue: '#3b82f6',
  yellow: '#eab308', purple: '#a855f7', cyan: '#06b6d4',
  orange: '#f97316', pink: '#ec4899',
}

interface Opinion {
  agent: string
  signal: string
  confidence: number
  reasoning: string
}

export default function PersonaCouncil() {
  const { personas: apiPersonas } = usePersonas()
  const personas = apiPersonas.length > 0 ? apiPersonas.map((p) => ({
    ...p,
    color: COLOR_HEX_MAP[p.color] || p.color,
    emoji: EMOJI_MAP[p.key] || EMOJI_MAP[p.id] || '🧠',
  })) : []
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

  const [streamProgress, setStreamProgress] = useState(0)

  const runCouncil = useCallback(async () => {
    setLoading(true)
    setOpinions([])
    setError('')
    setStreamProgress(0)
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      setStreamProgress(10)
      const reader = await runHedgeFund({
        tickers: [ticker],
        start_date: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        initial_cash: 100000,
        graph_nodes: personas.map((p) => ({
          id: p.id,
          type: 'agent' as const,
          position: { x: 0, y: 0 },
          data: { label: p.name, agent_key: p.key, description: p.style },
        }) as AppNode),
        graph_edges: [],
        signal: abort.signal,
      })
      const decoder = new TextDecoder()
      const pending: Opinion[] = []
      let sseBuf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        sseBuf += decoder.decode(value, { stream: true })
        const parts = sseBuf.split('\n\n')
        sseBuf = parts.pop() || ''
        for (const block of parts) {
          const dataLines = block.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6))
          if (dataLines.length === 0) continue
          try {
            const event = JSON.parse(dataLines.join(''))
            if (event.type === 'progress') {
              const pct = typeof event.progress === 'number' ? event.progress : typeof event.percent === 'number' ? event.percent : 0
              setStreamProgress(Math.min(pct, 90))
            } else if (event.type === 'opinion') {
              const o = event.data
              if (o?.agent) {
                setStreamProgress((prev) => Math.min(prev + Math.floor(80 / personas.length), 90))
                const opinion: Opinion = {
                  agent: o.agent_name || o.agent || 'Unknown',
                  signal: o.direction === 1 ? 'bullish' : o.direction === -1 ? 'bearish' : 'neutral',
                  confidence: Math.abs(o.score || o.confidence || 0.5),
                  reasoning: o.reasoning || o.reason || '',
                }
                pending.push(opinion)
                setOpinions([...pending])
              }
              setStreamProgress(95)
            } else if (event.type === 'complete') {
              const data = event.data
              if (data?.decisions && pending.length === 0) {
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
    } catch (e: unknown) {
      const err = e as Error
      if (err.name !== 'AbortError' && mountedRef.current) {
        setError(err.message)
        addToast('Council deliberation failed', 'error')
      }
    }
    if (mountedRef.current) { setLoading(false); setStreamProgress(100) }
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
            background: loading ? 'var(--bg-hover)' : 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
            color: loading ? 'var(--text-muted)' : '#fff',
          }}
        >
          {loading ? 'Convening Council...' : 'Convene Council'}
        </button>
      </div>

      {loading && !opinions.length && (
        <div className="flex items-center gap-3 py-4">
          <div className="flex -space-x-2">
            {personas.slice(0, 5).map((p, i) => (
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
            {personas.length} analysts deliberating...
          </span>
        </div>
      )}
      {loading && opinions.length > 0 && (
        <div style={{ width: '100%', height: 3, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${streamProgress}%`,
            height: '100%',
            background: 'var(--accent-cyan)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {error && (
        <div className="px-3 py-2 text-[10px] font-mono rounded-sm text-down" style={{ background: 'color-mix(in srgb, var(--accent-red) 10%, transparent)' }}>
          {error}
        </div>
      )}

      {opinions.length > 0 && (
        <>
          {/* Consensus Gauge & Stats */}
          <Card>
            <div className="flex items-stretch gap-3 p-2">
              <div className="flex-1 flex flex-col justify-center items-center gap-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted">Consensus</span>
                <span className={`text-xl font-bold ${consensusColor}`}>{consensus}</span>
                <div style={{ width: '100%', height: 4, background: 'var(--border-color)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.abs(netScore) * 100}%`,
                    borderRadius: 2,
                    background: netScore > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                    transition: 'width 0.5s ease',
                    marginLeft: netScore < 0 ? `${(1 - Math.abs(netScore)) * 100}%` : 0,
                  }} />
                </div>
                <span className="text-[8px] font-mono text-muted">{(Math.abs(netScore) * 100).toFixed(0)}% net sentiment</span>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex flex-col items-center px-3 py-1 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent-green) 10%, transparent)' }}>
                  <span className="text-lg font-bold text-up">{bullish}</span>
                  <span className="text-[8px] font-mono text-muted">BULLISH</span>
                </div>
                <div className="flex flex-col items-center px-3 py-1 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent-red) 10%, transparent)' }}>
                  <span className="text-lg font-bold text-down">{bearish}</span>
                  <span className="text-[8px] font-mono text-muted">BEARISH</span>
                </div>
                <div className="flex flex-col items-center px-3 py-1">
                  <span className="text-lg font-bold text-primary">{(avgConf * 100).toFixed(0)}%</span>
                  <span className="text-[8px] font-mono text-muted">CONFIDENCE</span>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="px-2 py-1 text-[9px] font-mono cursor-pointer rounded-sm self-center"
                style={{
                  background: copied ? 'color-mix(in srgb, var(--accent-green) 15%, transparent)' : 'var(--bg-hover)',
                  border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--border-color)'}`,
                  color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              >
                {copied ? 'COPIED' : 'SHARE'}
              </button>
            </div>
          </Card>

          {/* Council Votes - War Room Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {personas.map((persona) => {
              const opinion = opinions.find((o) => o.agent === persona.name)
              const signalColor = opinion?.signal === 'bullish' ? 'var(--accent-green)' : opinion?.signal === 'bearish' ? 'var(--accent-red)' : 'var(--accent-yellow)'
              return (
                <div
                  key={persona.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-sm transition-all duration-300"
                  style={{
                    background: opinion ? `${persona.color}08` : 'var(--bg-card)',
                    border: `1px solid ${opinion ? `${persona.color}30` : 'var(--border-color)'}`,
                    opacity: opinion ? 1 : 0.35,
                    boxShadow: opinion ? `0 0 0 1px ${persona.color}15` : 'none',
                  }}
                >
                  {/* Avatar column */}
                  <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 36 }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: `${persona.color}20`, border: `2px solid ${persona.color}` }}
                    >
                      {persona.emoji}
                    </div>
                    {opinion && (
                      <div style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: signalColor,
                        boxShadow: `0 0 4px ${signalColor}`,
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold whitespace-nowrap text-primary">
                          {persona.name}
                        </span>
                        <span className="text-[8px] font-mono truncate text-muted">
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

                    {/* Speech bubble */}
                    {opinion ? (
                      <div
                        className="mt-1.5 text-[10px] font-mono leading-relaxed p-2 rounded-sm relative"
                        style={{
                          background: `${persona.color}10`,
                          border: `1px solid ${persona.color}20`,
                          color: 'var(--text-secondary)',
                          borderLeft: `2px solid ${persona.color}`,
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: -5, left: 8,
                          width: 0, height: 0,
                          borderLeft: '5px solid transparent',
                          borderRight: '5px solid transparent',
                          borderBottom: `5px solid ${persona.color}20`,
                        }} />
                        {opinion.reasoning || 'No detailed reasoning provided.'}
                      </div>
                    ) : loading ? (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: persona.color }} />
                        <span className="text-[9px] font-mono text-muted">
                          {opinions.length > 0 ? 'No vote cast' : 'Analyzing...'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] font-mono mt-1.5 block text-muted">Waiting for council...</span>
                    )}

                    {/* Confidence bar */}
                    {opinion && (
                      <div className="mt-1.5" style={{ height: 2, background: 'var(--border-color)', borderRadius: 1, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${opinion.confidence * 100}%`,
                          background: signalColor,
                          borderRadius: 1,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
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
