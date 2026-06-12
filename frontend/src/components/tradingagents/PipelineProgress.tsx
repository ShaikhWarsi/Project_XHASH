import { useEffect, useRef, useState } from 'react'
import { useTradingAgentsStore } from '../../store/tradingagents'
import { cancelRun } from '../../api/tradingagents'
import { X, Loader2, Check, AlertTriangle, Clock, Terminal, StopCircle } from 'lucide-react'

const STAGES = [
  { key: 'scraping', label: 'Scrape', icon: '📡' },
  { key: 'analysts', label: 'Analysts', icon: '📋' },
  { key: 'debate', label: 'Bull/Bear', icon: '⚔️' },
  { key: 'risk', label: 'Risk', icon: '🛡️' },
  { key: 'final', label: 'Final', icon: '🎯' },
]

function StageDot({ stage, state }: { stage: string; state: 'pending' | 'running' | 'done' | 'failed' }) {
  const info = STAGES.find(s => s.key === stage) || STAGES[0]
  const isActive = state === 'running'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      opacity: state === 'pending' ? 0.4 : 1,
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        background: state === 'done' ? '#102a10'
          : state === 'running' ? '#1a2a3a'
          : state === 'failed' ? '#2a1010'
          : 'var(--bg-hover)',
        border: `2px solid ${
          state === 'done' ? '#22c55e'
          : state === 'running' ? '#4a9eff'
          : state === 'failed' ? '#ef4444'
          : 'var(--border-color)'
        }`,
        color: state === 'done' ? '#22c55e'
          : state === 'running' ? '#4a9eff'
          : state === 'failed' ? '#ef4444'
          : 'var(--text-muted)',
        animation: isActive ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
      }}>
        {state === 'done' ? <Check size={14} /> : state === 'failed' ? <X size={14} /> : isActive ? <Loader2 size={12} className="animate-spin" /> : <span>{info.icon}</span>}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        color: state === 'done' ? '#22c55e'
          : state === 'running' ? '#4a9eff'
          : state === 'failed' ? '#ef4444'
          : 'var(--text-muted)',
      }}>
        {info.label}
      </span>
    </div>
  )
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

export default function PipelineProgress() {
  const {
    status, activeRunId, events, currentStage, currentNode,
    toolCallCount, elapsedMs, stageStates,
    setStatus, setActiveRunId, setError, reset,
  } = useTradingAgentsStore()

  const [liveElapsed, setLiveElapsed] = useState(0)
  const [cancelling, setCancelling] = useState(false)
  const startRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'analyzing') {
      startRef.current = Date.now() - elapsedMs
      setLiveElapsed(elapsedMs)
      timerRef.current = setInterval(() => {
        setLiveElapsed(Date.now() - startRef.current)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [status, elapsedMs])

  const handleCancel = async () => {
    if (!activeRunId) return
    setCancelling(true)
    try {
      await cancelRun(activeRunId)
      setError('Pipeline cancelled')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed')
    }
    setCancelling(false)
  }

  if (status === 'idle') return null

  if (status === 'scraping') return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-cyan)',
    }}>
      <Loader2 size={12} className="animate-spin" />
      Scraping data for {useTradingAgentsStore.getState().ticker}...
    </div>
  )

  const lastEvent = events.length > 0 ? events[events.length - 1] : null
  const liveActivity = currentNode
    ? `Running: ${currentNode}`
    : lastEvent?.data?.label
      ? (lastEvent.data.label as string)
      : lastEvent?.event === 'stage_update' && lastEvent?.data?.label
        ? (lastEvent.data.label as string)
        : 'Waiting...'

  const allDone = status === 'done'
  const hasError = status === 'error' || events.some(e => e.event === 'pipeline_error' || e.event === 'pipeline_cancelled')

  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Stage dots */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'space-between',
      }}>
        {STAGES.map((stage, i) => (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <StageDot stage={stage.key} state={stageStates[stage.key] || 'pending'} />
            {i < STAGES.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: stageStates[stage.key] === 'done' ? '#22c55e' : 'var(--border-color)',
                margin: '0 8px', borderRadius: 1,
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Activity + timer row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
      }}>
        {allDone ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e' }}>
            <Check size={12} />
            Pipeline complete
          </div>
        ) : hasError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
            <AlertTriangle size={12} />
            Pipeline failed
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Loader2 size={10} className="animate-spin" />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {liveActivity}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          <Terminal size={10} />
          <span>{toolCallCount} calls</span>
          <span style={{ margin: '0 4px', color: 'var(--border-color)' }}>|</span>
          <Clock size={10} />
          <span>{formatElapsed(liveElapsed)}</span>
        </div>

        {!allDone && !hasError && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            title="Cancel pipeline"
            style={{
              padding: '2px 8px', fontSize: 9, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              background: 'transparent', color: '#ef4444',
              border: '1px solid #ef4444', borderRadius: 4,
              cursor: cancelling ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              opacity: cancelling ? 0.5 : 0.8,
            }}>
            <StopCircle size={10} />
            {cancelling ? 'Stopping...' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Event count */}
      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
        {events.length} events logged
      </div>
    </div>
  )
}