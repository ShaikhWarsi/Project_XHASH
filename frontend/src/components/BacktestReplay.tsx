import { useState, useEffect, useRef, useCallback } from 'react'

export interface ReplayBar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  trades?: { price: number; size: number; side: 'buy' | 'sell'; time: number }[]
  indicators?: Record<string, number>
}

export interface ReplayConfig {
  bars: ReplayBar[]
  speed?: number
  initialCapital?: number
}

interface Props {
  config: ReplayConfig
  onBar?: (bar: ReplayBar, index: number, total: number) => void
  onComplete?: () => void
  onPause?: () => void
}

export default function BacktestReplay({ config, onBar, onComplete, onPause }: Props) {
  const { bars, speed = 200, initialCapital = 10000 } = config
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const [pnl, setPnl] = useState(0)
  const [volume, setVolume] = useState(0)

  const currentBar = bars[currentIndex]
  const totalBars = bars.length
  const pctComplete = ((currentIndex + 1) / totalBars) * 100

  const play = useCallback(() => {
    if (intervalRef.current) return
    setIsPlaying(true)
    intervalRef.current = window.setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1
        if (next >= totalBars) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
          setIsPlaying(false)
          onComplete?.()
          return prev
        }
        setProgress((next / totalBars) * 100)
        return next
      })
    }, speed)
  }, [speed, totalBars, onComplete])

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPlaying(false)
    onPause?.()
  }, [onPause])

  const stop = useCallback(() => {
    pause()
    setCurrentIndex(0)
    setProgress(0)
    setPnl(0)
    setVolume(0)
  }, [pause])

  const stepForward = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, totalBars - 1))
    setProgress(((currentIndex + 2) / totalBars) * 100)
  }, [totalBars, currentIndex])

  const stepBackward = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0))
    setProgress((currentIndex / totalBars) * 100)
  }, [currentIndex, totalBars])

  const jumpTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, totalBars - 1))
    setCurrentIndex(clamped)
    setProgress((clamped / totalBars) * 100)
  }, [totalBars])

  useEffect(() => {
    if (currentBar) {
      setPnl(prev => prev + (currentBar.close - currentBar.open))
      setVolume(prev => prev + (currentBar.volume ?? 0))
      onBar?.(currentBar, currentIndex, totalBars)
    }
  }, [currentIndex])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const formatTime = (t: number) => {
    const d = new Date(t)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: 4, padding: 8, width: '100%',
    }}>
      <div style={{
        width: '100%', height: 4, background: 'rgba(255,255,255,0.1)',
        borderRadius: 2, marginBottom: 8, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pctComplete}%`, height: '100%',
          background: isPlaying ? 'var(--accent-green, #22c55e)' : 'var(--accent-blue, #3b82f6)',
          borderRadius: 2, transition: 'width 0.1s linear',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ color: 'var(--text-secondary)' }}>
          Bar {currentIndex + 1}/{totalBars}
          {currentBar && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{formatTime(currentBar.time)}</span>}
        </div>

        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={stepBackward} disabled={currentIndex === 0} style={btnStyle} title="Step Back">⏮</button>
          <button onClick={stop} style={{ ...btnStyle, color: '#ef4444' }} title="Stop">⏹</button>
          {isPlaying ? (
            <button onClick={pause} style={{ ...btnStyle, color: '#f59e0b' }} title="Pause">⏸</button>
          ) : (
            <button onClick={play} style={{ ...btnStyle, color: '#22c55e' }} title="Play">▶</button>
          )}
          <button onClick={stepForward} disabled={currentIndex === totalBars - 1} style={btnStyle} title="Step Forward">⏭</button>
        </div>
      </div>

      {currentBar && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 6,
          padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 3,
        }}>
          <Stat label="O" value={currentBar.open.toFixed(2)} color="var(--accent-blue)" />
          <Stat label="H" value={currentBar.high.toFixed(2)} color="var(--accent-green)" />
          <Stat label="L" value={currentBar.low.toFixed(2)} color="var(--accent-red)" />
          <Stat label="C" value={currentBar.close.toFixed(2)} color={currentBar.close >= currentBar.open ? 'var(--accent-green)' : 'var(--accent-red)'} />
          <Stat label="V" value={(currentBar.volume ?? 0).toLocaleString()} color="var(--accent-cyan)" />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
        <span>P&L: <span style={{ color: pnl >= 0 ? '#22c55e' : '#ef4444' }}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</span></span>
        <span>Cap: <span style={{ color: 'var(--text-secondary)' }}>${(initialCapital + pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
        <span>Vol: <span style={{ color: 'var(--accent-cyan)' }}>{volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
      </div>

      {currentBar?.trades && currentBar.trades.length > 0 && (
        <div style={{ marginTop: 4, padding: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 3 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Trades</div>
          {currentBar.trades.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: 8 }}>
              <span style={{ color: t.side === 'buy' ? '#22c55e' : '#ef4444' }}>{t.side.toUpperCase()}</span>
              <span>{t.size} @ ${t.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>Speed</span>
        <input
          type="range"
          min={50}
          max={1000}
          step={50}
          value={1100 - speed}
          onChange={e => {
            const newSpeed = 1100 - Number(e.target.value)
            if (intervalRef.current) {
              pause()
            }
          }}
          style={{ flex: 1, accentColor: 'var(--accent-blue, #3b82f6)', height: 4 }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>{speed}ms</span>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 26, height: 24, padding: 0, fontSize: 10, cursor: 'pointer',
  background: 'transparent', border: '1px solid var(--border-color, #1a2332)',
  borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'JetBrains Mono, monospace',
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{label}</div>
      <div style={{ color, fontSize: 10, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
