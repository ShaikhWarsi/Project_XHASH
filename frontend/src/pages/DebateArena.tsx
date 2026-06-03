import { useState, useEffect } from 'react'
import { TrendingUp, Shield, Eye, Brain, BarChart3, Activity, Users, MessageSquare } from 'lucide-react'
import Card from '../components/ui/Card'
import { api } from '../api/client'
import { usePersonas } from '../hooks/usePersonas'

function personaIcon(style: string) {
  const s = style.toLowerCase()
  if (s.includes('value') || s.includes('moat') || s.includes('deep')) return Shield
  if (s.includes('momentum') || s.includes('growth') || s.includes('disruptive')) return TrendingUp
  if (s.includes('risk') || s.includes('contrarian') || s.includes('tail')) return Eye
  if (s.includes('quant') || s.includes('arb') || s.includes('macro')) return BarChart3
  if (s.includes('sentiment')) return Activity
  return Brain
}

export default function DebateArena() {
  const { personas } = usePersonas()
  const bullAgents = personas.length > 0
    ? personas.map((p) => ({
        name: p.name, key: p.key,
        color: 'var(--accent-green)', icon: personaIcon(p.style), tag: 'BULL' as const,
      }))
    : [
        { name: 'Momentum Agent', key: 'momentum', color: 'var(--accent-green)', icon: TrendingUp, tag: 'BULL' as const },
        { name: 'Technicals Agent', key: 'technicals', color: 'var(--accent-cyan)', icon: BarChart3, tag: 'BULL' as const },
        { name: 'Sentiment Agent', key: 'sentiment', color: '#8b5cf6', icon: Activity, tag: 'BULL' as const },
      ]
  const bearAgents = personas.length > 0
    ? personas.map((p) => ({
        name: p.name, key: p.key,
        color: 'var(--accent-red)', icon: personaIcon(p.style), tag: 'BEAR' as const,
      }))
    : [
        { name: 'Value Agent', key: 'value', color: 'var(--accent-red)', icon: Shield, tag: 'BEAR' as const },
        { name: 'Risk Agent', key: 'risk', color: 'var(--accent-orange)', icon: Eye, tag: 'BEAR' as const },
        { name: 'Fundamentals Agent', key: 'fundamentals', color: 'var(--accent-yellow)', icon: Brain, tag: 'BEAR' as const },
      ]
  const allAgents = [...bullAgents, ...bearAgents]

  const [symbol, setSymbol] = useState('AAPL')
  const [rounds, setRounds] = useState(3)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState(-1)
  const [activeRound, setActiveRound] = useState(1)

  const agentColor = (name: string) => allAgents.find(a => name.toLowerCase().includes(a.key))?.color || 'var(--text-muted)'
  const agentIcon = (name: string) => allAgents.find(a => name.toLowerCase().includes(a.key))?.icon

  useEffect(() => {
    let interval: any
    if (loading) {
      interval = setInterval(() => {
        setActiveSpeakerIdx((prev) => (prev + 1) % allAgents.length)
        setActiveRound((prev) => {
          const next = prev + 1
          return next > rounds ? 1 : next
        })
      }, 1200)
    } else {
      setActiveSpeakerIdx(-1)
      setActiveRound(1)
    }
    return () => clearInterval(interval)
  }, [loading, rounds, allAgents.length])

  const runDebate = async (multi: boolean) => {
    setLoading(true)
    setResult(null)
    try {
      const endpoint = multi ? '/debate/multi-round' : '/debate/run'
      const bullKeys = bullAgents.map((a) => a.key).join(',')
      const bearKeys = bearAgents.map((a) => a.key).join(',')
      const params: any = { symbol, bull_agents: bullKeys, bear_agents: bearKeys }
      if (multi) params.rounds = rounds
      const r = await api.post(endpoint, null, { params })
      setResult(r.data)
    } catch (e: any) {
      setResult({ error: e.message })
    }
    setLoading(false)
  }

  const stanceColor = (s: string) => {
    if (!s) return 'var(--text-muted)'
    const clean = s.toLowerCase()
    if (clean.includes('bullish') || clean === 'bull') return 'var(--accent-green)'
    if (clean.includes('bearish') || clean === 'bear') return 'var(--accent-red)'
    return 'var(--accent-yellow)'
  }

  const getAgentStatus = (agent: { name: string; key: string; color: string; icon: any; tag: 'BULL' | 'BEAR' }, idx: number) => {
    if (loading) {
      return idx === activeSpeakerIdx ? 'SPEAKING...' : 'WAITING'
    }
    if (result) {
      const isWinner = result.consensus?.toLowerCase().includes(agent.tag.toLowerCase()) || 
                       (result.consensus?.toLowerCase().includes('bull') && agent.tag === 'BULL') ||
                       (result.consensus?.toLowerCase().includes('bear') && agent.tag === 'BEAR')
      return isWinner ? 'CONSENSUS WINNER' : 'CONCEDED'
    }
    return 'STANDBY'
  }

  return (
    <div style={{ background: 'var(--bg-app)' }} className="flex flex-col h-full font-mono-data text-[11px] text-primary">
      <style>{`
        @keyframes avatar-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0px transparent; }
          100% { transform: scale(1.05); box-shadow: 0 0 12px currentColor; }
        }
        .speaker-active {
          animation: avatar-pulse 0.8s infinite alternate;
          border-color: currentColor !important;
        }
        .debate-ring-center {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--border-color);
          border-radius: 50%;
          width: 140px;
          height: 140px;
          background: var(--bg-card);
        }
        .debate-ring-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid var(--accent-blue);
          border-radius: 50%;
          opacity: 0.3;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>

      {/* Header Panel */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <span className="font-bold text-[13px]">DEBATE ARENA</span>
        <span className="text-muted">|</span>
        <span className="text-[9px] text-muted">Bull vs Bear — Multi-Agent Adversarial Reasoning HUD</span>
      </div>

      {/* Input controls */}
      <div className="p-2 flex gap-2 items-center border-b border-default bg-card">
        <span className="text-[9px] text-muted">SYMBOL:</span>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-card border border-default text-primary px-2 py-1 text-[11px] font-mono-data w-[100px]" />
        <span className="text-[9px] text-muted ml-2">ROUNDS:</span>
        <input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} min={1} max={10}
          className="bg-card border border-default text-primary px-1.5 py-0.5 text-[10px] w-[50px]" />
        <button onClick={() => runDebate(false)} disabled={loading}
          className="text-white cursor-pointer px-3.5 py-1 text-[10px] disabled:opacity-60 font-semibold" style={{ background: 'var(--accent-blue)' }}>
          {loading ? 'DEBATING...' : 'DEBATE'}
        </button>
        <button onClick={() => runDebate(true)} disabled={loading}
          className="text-white cursor-pointer px-3.5 py-1 text-[10px] disabled:opacity-60 font-semibold" style={{ background: '#8b5cf6' }}>
          {loading ? 'DEBATING...' : `${rounds}-ROUND`}
        </button>
        <button onClick={() => {
          const content = document.querySelector('.debate-content')?.textContent || 'No debate content'
          const rounds = result?.rounds ?? []
          const md = `# Debate: ${symbol}\n\n${rounds.length > 0 ? rounds.map((r: any, i: number) => `## Round ${i + 1}\n${r.arguments?.map((a: any) => `**${a.agent}**: ${a.content || a.text}`).join('\n\n') || r.summary}`).join('\n\n') : ''}\n\n*Generated by Debate Arena*`
          navigator.clipboard.writeText(md).then(() => alert('Debate copied as Markdown to clipboard!'))
        }} disabled={!result}
          className="px-3 py-1 text-[10px] cursor-pointer disabled:opacity-40 font-semibold" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
          EXPORT MD
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {result?.error && <div className="text-down text-[10px] border border-red-500/20 bg-red-500/5 p-2 rounded">Error: {result.error}</div>}

        {/* --- Agent Arena Visualizer HUD --- */}
        <div className="grid grid-cols-3 items-center justify-items-center bg-card/40 border border-default rounded-lg p-4 min-h-[220px]">
          {/* Left panel: Bull Agents */}
          <div className="flex flex-col gap-3 w-full max-w-[180px]">
            <div className="text-[9px] font-bold text-up text-center mb-1 tracking-wider">▲ BULL COHORT</div>
            {bullAgents.map((agent, i) => {
              const idx = i
              const isSpeaking = activeSpeakerIdx === idx
              const Icon = agent.icon
              const status = getAgentStatus(agent, idx)
              return (
                <div key={agent.key} className={`flex items-center gap-2.5 p-2 rounded border border-default bg-card/60 transition-all duration-300 ${isSpeaking ? 'speaker-active' : ''}`} style={{ color: isSpeaking ? agent.color : undefined }}>
                  <div style={{ background: `${agent.color}15`, color: agent.color }} className="w-8 h-8 rounded-full flex items-center justify-center border border-default">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-primary">{agent.name}</div>
                    <div className="text-[8px] text-muted truncate mt-0.5">{status}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Center ring: Battle Status */}
          <div className="flex flex-col items-center">
            <div className="debate-ring-center">
              {loading && <div className="debate-ring-pulse" />}
              <MessageSquare size={20} className={loading ? 'text-accent-blue animate-bounce' : 'text-muted'} />
              <div className="font-bold text-[12px] mt-1 tracking-widest">
                {loading ? `ROUND ${activeRound}` : result ? 'VERDICT' : 'READY'}
              </div>
              <div className="text-[8px] text-muted mt-1 uppercase text-center px-2">
                {loading ? 'Synthesizing Argument...' : result ? (result.consensus || 'Neutral') : 'Await Command'}
              </div>
            </div>
            {result?.consensus && (
              <div className="mt-3 px-3 py-1 rounded-full border text-[9px] font-bold tracking-widest text-center" style={{ color: stanceColor(result.consensus), borderColor: stanceColor(result.consensus), background: `${stanceColor(result.consensus)}10` }}>
                {result.consensus.toUpperCase()}
              </div>
            )}
          </div>

          {/* Right panel: Bear Agents */}
          <div className="flex flex-col gap-3 w-full max-w-[180px]">
            <div className="text-[9px] font-bold text-down text-center mb-1 tracking-wider">▼ BEAR COHORT</div>
            {bearAgents.map((agent, i) => {
              const idx = i + bullAgents.length
              const isSpeaking = activeSpeakerIdx === idx
              const Icon = agent.icon
              const status = getAgentStatus(agent, idx)
              return (
                <div key={agent.key} className={`flex items-center gap-2.5 p-2 rounded border border-default bg-card/60 transition-all duration-300 ${isSpeaking ? 'speaker-active' : ''}`} style={{ color: isSpeaking ? agent.color : undefined }}>
                  <div style={{ background: `${agent.color}15`, color: agent.color }} className="w-8 h-8 rounded-full flex items-center justify-center border border-default">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-primary">{agent.name}</div>
                    <div className="text-[8px] text-muted truncate mt-0.5">{status}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Debate Summary & Stats */}
        {result?.consensus && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="bg-card px-3.5 py-2.5 rounded min-w-[200px] border border-default flex flex-col justify-center">
                <div className="text-[9px] text-muted uppercase">Debate Consensus Stance</div>
                <div className="text-xl font-bold mt-1" style={{ color: stanceColor(result.consensus) }}>
                  {result.consensus.toUpperCase()}
                </div>
                <div className="text-[10px] text-muted mt-1.5 flex items-center gap-1">
                  <span>Confidence Index:</span>
                  <span className="font-semibold text-primary">{(result.consensus_confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="bg-card border border-default px-3.5 py-2.5 rounded flex-1">
                <div className="text-[9px] text-muted uppercase">Consensus Summary Memo</div>
                <div className="text-[10px] text-primary mt-1.5 leading-relaxed">{result.summary}</div>
              </div>
            </div>

            {/* Timeline Rounds if multi-round */}
            {result.rounds && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-muted tracking-wider">DEBATE ROUND HISTORY TIMELINE</div>
                <div className="flex gap-2">
                  {result.rounds.map((r: any, i: number) => (
                    <div key={i} className="flex-1 bg-card px-2.5 py-2 rounded border border-default flex flex-col justify-between" style={{ borderTop: `2.5px solid ${stanceColor(r.consensus)}` }}>
                      <div className="flex justify-between items-center text-[9px] text-muted">
                        <span>R{r.round}</span>
                        <span style={{ color: stanceColor(r.consensus) }}>{(r.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-[11px] font-bold mt-1" style={{ color: stanceColor(r.consensus) }}>
                        {r.consensus.toUpperCase()}
                      </div>
                      <div className="flex justify-between text-[8px] text-muted mt-2 pt-1 border-t border-default">
                        <span className="text-up">{r.bull_count} Bull</span>
                        <span className="text-down">{r.bear_count} Bear</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debate Flow Path HUD */}
            <div className="flex items-center gap-1.5 bg-card/60 border border-default rounded px-3 py-2">
              <Users size={11} className="text-muted" />
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Arena Vote Logs:</span>
              <div className="flex items-center gap-1 overflow-x-auto flex-1 text-[9px] font-mono-data">
                {result.rounds ? (
                  result.rounds.map((r: any, i: number) => (
                    <span key={i} className="flex items-center">
                      <span className="px-1.5 py-0.5 rounded font-semibold" style={{ color: stanceColor(r.consensus), background: `${stanceColor(r.consensus)}15` }}>
                        R{r.round}: {r.consensus.toUpperCase()}
                      </span>
                      {i < result.rounds.length - 1 && <span className="text-muted mx-2">→</span>}
                    </span>
                  ))
                ) : (
                  <span className="px-1.5 py-0.5 rounded font-semibold" style={{ color: stanceColor(result.consensus), background: `${stanceColor(result.consensus)}15` }}>
                    {result.consensus.toUpperCase()} ({(result.consensus_confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>

            {/* Arguments Side-by-side Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <TrendingUp size={11} style={{ color: 'var(--accent-green)' }} />
                  <span className="text-[10px] font-bold text-up uppercase tracking-wider">Bull Arguments & Evidence</span>
                </div>
                <div className="space-y-2">
                  {(result.bull_arguments || result.final_bull_arguments || []).map((a: any, i: number) => {
                    const color = agentColor(a.agent)
                    const Icon = agentIcon(a.agent)
                    return (
                      <div key={i} className="bg-card px-3 py-2 rounded.md border border-default" style={{ borderLeft: `3px solid ${color}` }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {Icon && <Icon size={9} style={{ color }} />}
                          <span className="text-[9px] font-bold text-primary">{a.agent.toUpperCase()}</span>
                          <span className="text-[8px] text-muted ml-auto px-1 rounded bg-default font-mono-data">{(a.confidence * 100).toFixed(0)}% Conf</span>
                        </div>
                        <div className="text-[10px] text-primary leading-normal">{a.thesis}</div>
                        {a.evidence && a.evidence.length > 0 && (
                          <div className="text-[8px] text-muted mt-2 pt-1 border-t border-default flex flex-wrap gap-1">
                            <span className="font-semibold">Evidence:</span>
                            {a.evidence.map((ev: string, idx: number) => (
                              <span key={idx} className="bg-default/60 px-1 py-0.5 rounded text-[8px]">{ev}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <Shield size={11} style={{ color: 'var(--accent-red)' }} />
                  <span className="text-[10px] font-bold text-down uppercase tracking-wider">Bear Arguments & Evidence</span>
                </div>
                <div className="space-y-2">
                  {(result.bear_arguments || result.final_bear_arguments || []).map((a: any, i: number) => {
                    const color = agentColor(a.agent)
                    const Icon = agentIcon(a.agent)
                    return (
                      <div key={i} className="bg-card px-3 py-2 rounded.md border border-default" style={{ borderLeft: `3px solid ${color}` }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {Icon && <Icon size={9} style={{ color }} />}
                          <span className="text-[9px] font-bold text-primary">{a.agent.toUpperCase()}</span>
                          <span className="text-[8px] text-muted ml-auto px-1 rounded bg-default font-mono-data">{(a.confidence * 100).toFixed(0)}% Conf</span>
                        </div>
                        <div className="text-[10px] text-primary leading-normal">{a.thesis}</div>
                        {a.evidence && a.evidence.length > 0 && (
                          <div className="text-[8px] text-muted mt-2 pt-1 border-t border-default flex flex-wrap gap-1">
                            <span className="font-semibold">Evidence:</span>
                            {a.evidence.map((ev: string, idx: number) => (
                              <span key={idx} className="bg-default/60 px-1 py-0.5 rounded text-[8px]">{ev}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="flex items-center justify-center h-48 border border-dashed border-default rounded bg-card/25 text-muted text-[10px]">
            Enter a symbol above and choose DEBATE or MULTI-ROUND to spin up the AI Council.
          </div>
        )}
      </div>
    </div>
  )
}
