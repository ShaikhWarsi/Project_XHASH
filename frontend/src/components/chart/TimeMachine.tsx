import { useState, useRef, useCallback, useEffect } from 'react'
import type { BarData } from '../../api/types'
import type { MultiChartSync } from './MultiChartSync'

interface TimeMachineProps {
  data: BarData[]
  onSeek: (index: number) => void
  currentIndex: number | null
  disabled?: boolean
  multiChartSync?: MultiChartSync
  onSyncAll?: () => void
  synced?: boolean
}

const SPEEDS = [1, 2, 5, 10, 25]

export default function TimeMachine({ data, onSeek, currentIndex, disabled, multiChartSync, onSyncAll, synced }: TimeMachineProps) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const playRef = useRef<number | null>(null)
  const indexRef = useRef(currentIndex ?? Math.max(0, data.length - 1))
  const playStartRef = useRef<number | null>(null)

  useEffect(() => {
    indexRef.current = currentIndex ?? Math.max(0, data.length - 1)
  }, [currentIndex, data.length])

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
    playStartRef.current = Date.now()
    const MAX_PLAY_MS = 30000
    playRef.current = window.setInterval(() => {
      if (Date.now() - (playStartRef.current ?? 0) > MAX_PLAY_MS) {
        setPlaying(false)
        if (playRef.current != null) {
          clearInterval(playRef.current)
          playRef.current = null
        }
        return
      }
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
      if (synced && multiChartSync) {
        multiChartSync.seekToIndex(next, data.length)
      }
    }, ms)
    return () => {
      if (playRef.current != null) {
        clearInterval(playRef.current)
        playRef.current = null
      }
    }
  }, [playing, speed, data.length, onSeek, synced, multiChartSync])

  if (data.length === 0 || disabled) return null

  const lastTime = data[data.length - 1]?.time
  const curIdx = currentIndex != null ? Math.min(currentIndex, data.length - 1) : data.length - 1
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
        {playing ? '\u25A0 STOP' : '\u25B6 PLAY'}
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
        onChange={(e) => {
          const idx = Number(e.target.value)
          onSeek(idx)
          if (synced && multiChartSync) {
            multiChartSync.seekToIndex(idx, data.length)
          }
        }}
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

      {multiChartSync && multiChartSync.getChartCount() > 1 && (
        <>
          <div style={{ width: 1, height: 12, background: '#1a2332' }} />
          <button onClick={onSyncAll}
            style={{
              background: synced ? 'rgba(38,166,154,0.2)' : 'rgba(117,117,117,0.15)',
              border: '1px solid ' + (synced ? '#26a69a' : '#757575'),
              color: synced ? '#26a69a' : '#757575',
              cursor: 'pointer', padding: '1px 6px',
              fontSize: 8, borderRadius: 2,
            }}>
            {synced ? '\u26A1 SYNCED' : '\u26A1 SYNC'}
          </button>
        </>
      )}
    </div>
  )
}
