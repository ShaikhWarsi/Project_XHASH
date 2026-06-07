import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { AlertTriangle, Users, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'

interface Opinion { agent: string; signal: 'bullish' | 'bearish' | 'neutral'; confidence: number; reasoning: string }

const SIGNAL_ICONS: Record<string, any> = { bullish: ThumbsUp, bearish: ThumbsDown, neutral: Minus }
const SIGNAL_COLORS: Record<string, string> = { bullish: 'var(--accent-green)', bearish: 'var(--accent-red)', neutral: 'var(--text-muted)' }

export default function DisagreementDetector() {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<Opinion[]>([])

  const handleParse = useCallback(() => {
    if (!input.trim()) return
    try {
      const data = JSON.parse(input)
      const opinions: Opinion[] = Array.isArray(data) ? data : data.opinions || data.signals || []
      setParsed(opinions)
    } catch { setParsed([]) }
  }, [input])

  const total = parsed.length
  const bullish = parsed.filter(o => o.signal === 'bullish').length
  const bearish = parsed.filter(o => o.signal === 'bearish').length
  const neutral = parsed.filter(o => o.signal === 'neutral').length
  const disagreementScore = total > 0 ? Math.min(bullish, bearish) / Math.max(bullish, bearish, 1) : 0
  const controversyLevel = disagreementScore > 0.5 ? 'high' : disagreementScore > 0.2 ? 'medium' : 'low'

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><AlertTriangle size={20} /> Disagreement Detector</h1>
      <p className="text-sm text-muted">Detect when 3+ agent personas disagree on a ticker — highlighting controversy and split opinions.</p>

      <Card title="Agent Opinions (JSON)">
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-3 py-2 text-[11px] font-mono text-primary outline-none min-h-[100px]"
          placeholder='[{&quot;agent&quot;: &quot;Warren Buffett&quot;, &quot;signal&quot;: &quot;bullish&quot;, &quot;confidence&quot;: 0.85, &quot;reasoning&quot;: &quot;Strong moat...&quot;}]' />
        <button onClick={handleParse} disabled={!input.trim()}
          className="mt-2 px-3 py-1.5 rounded text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">Analyze Disagreement</button>
      </Card>

      {parsed.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Card title="Total Agents"><div className="text-2xl font-bold">{total}</div></Card>
            <Card title="Bullish"><div className="text-2xl font-bold text-accent-green">{bullish}</div></Card>
            <Card title="Bearish"><div className="text-2xl font-bold text-accent-red">{bearish}</div></Card>
            <Card title="Neutral"><div className="text-2xl font-bold text-muted">{neutral}</div></Card>
          </div>

          <Card title="Controversy Score">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold font-mono" style={{ color: controversyLevel === 'high' ? 'var(--accent-red)' : controversyLevel === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                {(disagreementScore * 100).toFixed(0)}%
              </div>
              <div className="flex-1 h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${disagreementScore * 100}%`, background: controversyLevel === 'high' ? 'var(--accent-red)' : controversyLevel === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)' }} />
              </div>
              <Badge label={controversyLevel === 'high' ? 'HIGH DISAGREEMENT' : controversyLevel === 'medium' ? 'MODERATE' : 'CONSENSUS'} variant={controversyLevel === 'high' ? 'error' : controversyLevel === 'medium' ? 'warning' : 'success'} />
            </div>
          </Card>

          <Card title="Agent Opinions">
            <div className="space-y-1.5">
              {parsed.map((o, i) => {
                const Icon = SIGNAL_ICONS[o.signal] || Minus
                return (
                  <div key={i} className="flex items-start gap-2 bg-[var(--bg-hover)] border border-default rounded px-2 py-1.5">
                    <Icon size={14} style={{ color: SIGNAL_COLORS[o.signal], marginTop: 2 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-primary">{o.agent}</span>
                        <Badge label={o.signal} variant={o.signal === 'bullish' ? 'success' : o.signal === 'bearish' ? 'error' : 'default'} />
                        <span className="text-[9px] text-muted">{(o.confidence * 100).toFixed(0)}%</span>
                      </div>
                      {o.reasoning && <div className="text-[10px] text-muted mt-0.5">{o.reasoning}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {controversyLevel === 'high' && (
            <Card title="Disagreement Alert">
              <div className="flex items-start gap-2 p-2 rounded bg-[rgba(239,68,68,0.1)] border border-down">
                <AlertTriangle size={16} className="text-accent-red shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-accent-red">High Disagreement Detected</div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {bullish} agents are bullish while {bearish} are bearish. This split suggests significant uncertainty.
                    Consider waiting for more consensus before taking a directional position.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
