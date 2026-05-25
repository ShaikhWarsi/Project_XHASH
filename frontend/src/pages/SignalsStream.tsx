import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/Spinner'

interface StreamSignal {
  symbol: string
  type: string
  direction: number
  confidence: number
  timestamp: string
  engine?: string
}

interface StreamEvent {
  signals: StreamSignal[]
  composite_score: number
  regime: string
  timestamp: string
}

export default function SignalsStream() {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [filterSymbol, setFilterSymbol] = useState('')
  const [filterEngine, setFilterEngine] = useState('')
  const esRef = useRef<EventSource | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterSymbol) params.set('symbol', filterSymbol)
    if (filterEngine) params.set('engine', filterEngine)
    const url = `/api/signals/stream?${params.toString()}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => { setConnected(false); setError('Connection lost') }
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamEvent
        setEvents((prev) => [data, ...prev].slice(0, 200))
        setError('')
      } catch { /* ignore parse errors */ }
    }

    return () => { es.close(); esRef.current = null }
  }, [filterSymbol, filterEngine])

  const latestEvent = events[0]
  const filteredEvents = filterSymbol
    ? events.filter((e) => e.signals.some((s) => s.symbol.includes(filterSymbol.toUpperCase())))
    : events

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">Signals Stream</h1>
          <p className="text-xs font-mono text-muted">Real-time signal feed from all engines</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-up' : 'bg-down'}`} />
          <span className="text-[10px] font-mono-data text-muted">{connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
          placeholder="Filter by symbol..."
          className="bg-input border border-input text-primary font-mono-data text-[11px] px-2 py-1 outline-none rounded-sm w-40"
        />
        <input
          value={filterEngine}
          onChange={(e) => setFilterEngine(e.target.value)}
          placeholder="Filter by engine..."
          className="bg-input border border-input text-primary font-mono-data text-[11px] px-2 py-1 outline-none rounded-sm w-40"
        />
        <Badge label={`${events.length} events`} variant="info" size="sm" />
      </div>

      {latestEvent && (
        <Card title="Current Composite">
          <div className="flex items-center gap-4">
            <div className={`text-2xl font-bold font-mono-data ${latestEvent.composite_score >= 0 ? 'text-up' : 'text-down'}`}>
              {(latestEvent.composite_score * 100).toFixed(1)}%
            </div>
            <div className="text-sm font-mono-data text-secondary">
              Regime: <span className="text-accent-cyan">{latestEvent.regime || 'N/A'}</span>
            </div>
            <div className="text-[10px] font-mono-data text-muted">
              {new Date(latestEvent.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {latestEvent.signals.slice(0, 10).map((s, i) => (
              <Badge
                key={`${s.symbol}-${i}`}
                label={`${s.symbol} ${s.direction > 0 ? '↑' : s.direction < 0 ? '↓' : '→'} ${(s.confidence * 100).toFixed(0)}%`}
                variant={s.direction > 0 ? 'success' : s.direction < 0 ? 'error' : 'warning'}
                size="sm"
              />
            ))}
          </div>
        </Card>
      )}

      <div className="flex-1 overflow-auto" ref={containerRef}>
        {!connected && events.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <Spinner label="Connecting to signal stream..." />
          </div>
        )}
        {error && (
          <div className="text-[10px] font-mono-data text-down text-center py-2">{error}</div>
        )}
        {filteredEvents.length === 0 && connected && (
          <div className="text-[11px] font-mono-data text-muted text-center py-8">
            {filterSymbol ? `No signals matching "${filterSymbol}"` : 'Waiting for signals...'}
          </div>
        )}
        {filteredEvents.slice(0, 100).map((evt, i) => (
          <div key={`${evt.timestamp}-${i}`} className="bg-card border border-default rounded-sm px-2.5 py-1.5 mb-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono-data text-muted">
                {new Date(evt.timestamp).toLocaleTimeString()}
              </span>
              <span className={`text-[10px] font-mono-data font-bold ${evt.composite_score >= 0 ? 'text-up' : 'text-down'}`}>
                Score: {(evt.composite_score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {evt.signals.map((s, j) => (
                <Badge
                  key={`${s.symbol}-${j}`}
                  label={`${s.symbol} ${s.type} ${s.direction > 0 ? '↑' : s.direction < 0 ? '↓' : '→'} ${(s.confidence * 100).toFixed(0)}%`}
                  variant={s.direction > 0 ? 'success' : s.direction < 0 ? 'error' : 'warning'}
                  size="sm"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
