import { useState, useEffect, useRef } from 'react'
import Breadcrumbs from '../components/Breadcrumbs'
import VirtualList from '../components/VirtualList'
import { useApiQuery } from '../hooks/useApiQuery'

export default function AuditLogPage() {
  const [liveTail, setLiveTail] = useState(false)
  const [paused, setPaused] = useState(false)
  const [diffEntry, setDiffEntry] = useState<any | null>(null)
  const [replaying, setReplaying] = useState(false)
  const [replayProgress, setReplayProgress] = useState(0)
  const [replayHighlight, setReplayHighlight] = useState<number | null>(null)
  const tailRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  const { data: rawLogs, isLoading } = useApiQuery<{ logs: any[]; total: number }>('/audit/logs', undefined, { refetchInterval: liveTail && !paused ? 3000 : undefined })
  const logs = Array.isArray(rawLogs) ? rawLogs : (rawLogs?.logs ?? [])



  const stopReplay = () => {
    cancelledRef.current = true
    if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null }
    setReplaying(false)
    setReplayHighlight(null)
    setReplayProgress(0)
  }

  const startReplay = () => {
    cancelledRef.current = false
    setReplaying(true)
    setReplayProgress(0)
    setReplayHighlight(0)
    let idx = 0
    replayRef.current = setInterval(() => {
      if (cancelledRef.current || idx >= logs.length - 1) {
        stopReplay()
        return
      }
      idx++
      setReplayProgress(idx)
      setReplayHighlight(idx)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (replayRef.current) clearInterval(replayRef.current)
      if (tailRef.current) clearInterval(tailRef.current)
    }
  }, [])

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString()
    } catch {
      return ts
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Breadcrumbs />
        <div className="font-mono-data text-[11px] text-muted p-4">Loading audit logs...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLiveTail((t) => !t); setPaused(false) }}
            className="text-[10px] font-mono px-3 py-1 rounded-sm cursor-pointer flex items-center gap-1"
            style={{
              background: liveTail ? (paused ? 'var(--accent-yellow)20' : 'var(--accent-green)20') : 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: liveTail ? (paused ? 'var(--accent-yellow)' : 'var(--accent-green)') : 'var(--text-muted)',
            }}
          >
            {liveTail && !paused && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)',
                display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            )}
            {liveTail ? (paused ? 'PAUSED' : 'LIVE TAIL') : 'LIVE TAIL'}
          </button>
          {liveTail && (
            <button
              onClick={() => setPaused((p) => !p)}
              className="text-[10px] font-mono px-2 py-1 rounded-sm cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {replaying ? (
            <button
              onClick={stopReplay}
              className="text-[10px] font-mono px-3 py-1 rounded-sm cursor-pointer"
              style={{ background: 'var(--accent-red)20', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
            >
              STOP
            </button>
          ) : (
            <button
              onClick={startReplay}
              disabled={logs.length === 0}
              className="text-[10px] font-mono px-3 py-1 rounded-sm cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: logs.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              }}
            >
              REPLAY
            </button>
          )}
        </div>
      </div>

      {replaying && logs.length > 0 && (
        <div className="mb-1">
          <div className="flex items-center gap-2 text-[9px] font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Replaying log {replayProgress + 1} of {logs.length}</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${((replayProgress + 1) / logs.length) * 100}%`,
              height: '100%',
              background: 'var(--accent-blue)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="font-mono-data text-[11px] text-muted p-8 text-center" style={{ border: '1px dashed var(--border-color)' }}>
          No audit logs yet — logs will appear here as events are recorded
        </div>
      ) : (
        <div style={{ height: 400 }}>
          <VirtualList
            items={logs}
            itemHeight={36}
            renderItem={(log, i) => (
              <div key={log.id || i}>
                <div
                  className="flex items-start gap-2 px-2 py-1.5 rounded-sm"
                  style={{
                    background: replayHighlight === i ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'var(--bg-card)',
                    border: replayHighlight === i ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    transition: 'background 0.2s, border 0.2s',
                  }}
                >
                  <span className="text-[9px] font-mono shrink-0" style={{ color: 'var(--text-muted)', minWidth: 70 }}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span className="text-[10px] font-mono shrink-0 px-1.5 py-0 rounded-sm" style={{
                    background: log.level === 'ERROR' || log.level === 'CRITICAL'
                      ? 'var(--accent-red)20' : log.level === 'WARN'
                        ? 'var(--accent-yellow)20' : 'var(--accent-blue)15',
                    color: log.level === 'ERROR' || log.level === 'CRITICAL'
                      ? 'var(--accent-red)' : log.level === 'WARN'
                        ? 'var(--accent-yellow)' : 'var(--accent-blue)',
                  }}>
                    {log.level || 'INFO'}
                  </span>
                  <span className="text-[10px] font-mono flex-1" style={{ color: 'var(--text-primary)' }}>
                    {log.action || log.message || JSON.stringify(log)}
                  </span>
                  {log.before && log.after && (
                    <button
                      onClick={() => setDiffEntry(diffEntry?.id === log.id ? null : log)}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm cursor-pointer shrink-0"
                      style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--accent-cyan)' }}
                    >
                      Diff
                    </button>
                  )}
                </div>
                {diffEntry?.id === log.id && log.before && log.after && (
                  <div
                    className="flex gap-2 p-2 rounded-sm mt-0.5"
                    style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}
                  >
                    <div className="flex-1 p-2 rounded-sm text-[9px] font-mono" style={{ background: 'var(--accent-red)10', color: 'var(--accent-red)' }}>
                      <div className="text-[8px] font-semibold mb-1 uppercase" style={{ color: 'var(--accent-red)' }}>Before</div>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(log.before, null, 2)}</pre>
                    </div>
                    <div className="flex-1 p-2 rounded-sm text-[9px] font-mono" style={{ background: 'var(--accent-green)10', color: 'var(--accent-green)' }}>
                      <div className="text-[8px] font-semibold mb-1 uppercase" style={{ color: 'var(--accent-green)' }}>After</div>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(log.after, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
            maxHeight={400}
            keyExtractor={(log, i) => log.id || `log-${i}`}
          />
        </div>
      )}
    </div>
  )
}
