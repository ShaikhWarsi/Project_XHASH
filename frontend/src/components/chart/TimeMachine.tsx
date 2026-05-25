import { useState, useRef, useCallback, useEffect } from 'react'
import type { BarData } from '../../api/types'

interface TimeMachineProps {
  data: BarData[]
  onSeek: (index: number) => void
  currentIndex: number | null
  disabled?: boolean
}

export default function TimeMachine({ data, onSeek, currentIndex, disabled }: TimeMachineProps) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const playRef = useRef<number | null>(null)
  const indexRef = useRef(currentIndex ?? data.length - 1)

  useEffect(() => {
    indexRef.current = currentIndex ?? data.length - 1
  }, [currentIndex, data.length])

  const SPEEDS = [1, 2, 5, 10, 25]

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false)
      if (playRef.current != null) {
        clearInterval(playRef.current)
        playRef.current = null
      }
      return
    }
    setPlaying(true)
  }, [playing])

  useEffect(() => {
    if (!playing) return
    const ms = Math.max(50, 1000 / speed)
    playRef.current = window.setInterval(() => {
      const next = indexRef.current + 1
      if (next >= data.length) {
        setPlaying(false)
        if (playRef.current != null) {
          clearInterval(playRef.current)
          playRef.current = null
        }
        return
      }
      indexRef.current = next
      onSeek(next)
    }, ms)
    return () => {
      if (playRef.current != null) {
        clearInterval(playRef.current)
        playRef.current = null
      }
    }
  }, [playing, speed, data.length, onSeek])

  if (data.length === 0 || disabled) return null

  const lastTime = data[data.length - 1].time
  const curIdx = currentIndex ?? data.length - 1
  const curTime = data[curIdx]?.time ?? lastTime
  const pct = ((curIdx) / (data.length - 1)) * 100

  const formatTime = (t: number) => {
    const d = new Date(t * 1000)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '2px 8px',
      borderTop: '1px solid var(--border-color, #1a2332)',
      background: 'var(--bg-card, #0d1117)',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      color: 'var(--text-secondary, #5d6b7e)',
      minHeight: 24,
    }}>
      <button onClick={togglePlay} disabled={curIdx >= data.length - 1}
        style={{
          background: playing ? 'rgba(239,83,80,0.2)' : 'rgba(59,130,246,0.15)',
          border: '1px solid ' + (playing ? '#ef5350' : '#3b82f6'),
          color: playing ? '#ef5350' : '#3b82f6',
          cursor: 'pointer', padding: '1px 6px',
          fontSize: 9, borderRadius: 2,
          opacity: curIdx >= data.length - 1 ? 0.4 : 1,
        }}>
        {playing ? '? STOP' : '? PLAY'}
      </button>

      <div style={{ width: 1, height: 12, background: '#1a2332' }} />

      {SPEEDS.map((s) => (
        <button key={s} onClick={() => setSpeed(s)}
          style={{
            background: speed === s ? 'rgba(59,130,246,0.15)' : 'transparent',
            border: '1px solid ' + (speed === s ? '#3b82f6' : 'transparent'),
            color: speed === s ? '#3b82f6' : '#5d6b7e',
            cursor: 'pointer', padding: '1px 4px',
            fontSize: 8, borderRadius: 2,
          }}>
          {s}x
        </button>
      ))}

      <div style={{ width: 1, height: 12, background: '#1a2332' }} />

      <span style={{ color: '#8b95a5', minWidth: 130 }}>{formatTime(curTime)}</span>

      <input type="range" min={0} max={data.length - 1} value={curIdx}
        onChange={(e) => onSeek(Number(e.target.value))}
        style={{ flex: 1, height: 3, accentColor: '#3b82f6', cursor: 'pointer' }} />

      <span style={{ fontSize: 9, minWidth: 50, textAlign: 'right' }}>
        {curIdx + 1} / {data.length}
      </span>

      <div style={{
        width: 60, height: 4, background: '#1a2332', borderRadius: 2, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: pct + '%', background: '#3b82f6', borderRadius: 2,
          transition: 'width 0.05s linear',
        }} />
      </div>

      {playing && <span style={{ color: '#ef5350', fontSize: 8 }}>LIVE</span>}
    </div>
  )
}
