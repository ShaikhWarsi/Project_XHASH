import { useEffect, useRef, useState, type ComponentProps } from 'react'

interface LogEntry {
  id: string
  timestamp: string
  action: string
  details: string
  type: 'trade' | 'signal' | 'system' | 'risk' | 'backtest'
}

function ExpandableDetails({ details }: { details: string } & Omit<ComponentProps<'span'>, 'style'>) {
  const [expanded, setExpanded] = useState(false)
  const long = details.length > 80
  return (
    <span
      onClick={() => long && setExpanded(v => !v)}
      style={{
        color: 'var(--text-secondary)',
        overflow: expanded ? 'visible' : 'hidden',
        textOverflow: expanded ? 'clip' : 'ellipsis',
        whiteSpace: expanded ? 'normal' : 'nowrap',
        cursor: long ? 'pointer' : 'default',
        wordBreak: 'break-all',
      }}
      title={long ? (expanded ? 'Click to collapse' : 'Click to expand') : undefined}
    >
      {details}
    </span>
  )
}

let _globalLog: LogEntry[] = []
const _listeners: Set<() => void> = new Set()

function _notify() { for (const fn of _listeners) fn() }

export function pushLog(action: string, details: string, type: LogEntry['type'] = 'system') {
  _globalLog = [{
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
    action, details, type,
  }, ..._globalLog].slice(0, 50)
  _notify()
}

export function getLogs() { return _globalLog }

export default function LastActionLog({ maxHeight = 160 }: { maxHeight?: number }) {
  const [, setTick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setTick((t) => t + 1)
    _listeners.add(handler)
    return () => { _listeners.delete(handler) }
  }, [])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [_globalLog.length])

  const TYPE_STYLES: Record<string, { color: string; bg: string }> = {
    trade: { color: 'var(--accent-green)', bg: 'rgba(34,197,94,0.08)' },
    signal: { color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.08)' },
    risk: { color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.08)' },
    backtest: { color: 'var(--accent-purple)', bg: 'rgba(168,85,247,0.08)' },
    system: { color: 'var(--text-muted)', bg: 'transparent' },
  }

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        padding: '4px 8px', fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.05em', color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
      }}>
        LAST ACTION LOG
      </div>
      <div ref={ref} style={{ maxHeight, overflowY: 'auto', background: 'var(--bg-app)' }}>
        {_globalLog.length === 0 ? (
          <div style={{
            padding: '12px 8px', fontSize: 10, textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)',
          }}>
            No actions yet. Place a trade or run analysis to see activity here.
          </div>
        ) : (
          _globalLog.map((entry) => {
            const s = TYPE_STYLES[entry.type] || TYPE_STYLES.system
            return (
              <div key={entry.id} style={{
                display: 'flex', gap: 6, padding: '3px 8px',
                borderBottom: '1px solid var(--border-color)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                background: s.bg,
              }}>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{entry.timestamp}</span>
                <span style={{ color: s.color, whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: 9 }}>{entry.action}</span>
                <ExpandableDetails details={entry.details} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
