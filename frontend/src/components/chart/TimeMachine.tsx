import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Square, SkipForward, SkipBack, Zap, ZapOff, Bookmark, Flame, Eye } from 'lucide-react'
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
const BOOKMARK_KEY = 'timemachine_bookmarks'

function loadBookmarks(): number[] {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]') }
  catch { return [] }
}

function saveBookmarks(bookmarks: number[]) {
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks))
}

function findCrashIndex(data: BarData[]): number {
  if (data.length < 10) return 0
  let maxVolIdx = 0
  let maxVol = 0
  for (let i = 5; i < data.length - 5; i++) {
    const v1 = data[i - 1]?.volume ?? 0; const v2 = data[i - 2]?.volume ?? 0; const v3 = data[i - 3]?.volume ?? 0; const avg = (v1 + v2 + v3) / 3
    const spike = avg > 0 ? (data[i]?.volume ?? 0) / avg : 0
    if (spike > maxVol) {
      maxVol = spike
      maxVolIdx = i
    }
  }
  return Math.max(0, maxVolIdx - 20)
}

export default function TimeMachine({ data, onSeek, currentIndex, disabled, multiChartSync, onSyncAll, synced }: TimeMachineProps) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [bookmarks, setBookmarks] = useState<number[]>(() => loadBookmarks())
  const [showOverview, setShowOverview] = useState(false)
  const playRef = useRef<number | null>(null)
  const indexRef = useRef(currentIndex ?? Math.max(0, data.length - 1))
  const playStartRef = useRef<number | null>(null)
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    indexRef.current = currentIndex ?? Math.max(0, data.length - 1)
  }, [currentIndex, data.length])

  useEffect(() => {
    if (!showOverview || !overviewCanvasRef.current || data.length < 2) return
    const canvas = overviewCanvasRef.current
    const dpr = window.devicePixelRatio || 1
    const cssW = 120
    const cssH = 24
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    const styles = getComputedStyle(document.documentElement)
    const bgCard = styles.getPropertyValue('--bg-card').trim() || '#0d1117'
    const accentCyan = styles.getPropertyValue('--accent-cyan').trim() || '#00e5ff'
    const accentGreen = styles.getPropertyValue('--accent-green').trim() || '#22c55e'
    const w = cssW
    const h = cssH
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = bgCard
    ctx.fillRect(0, 0, w, h)

    const closes = data.map((d) => d.close)
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const range = max - min || 1
    const curIdx = currentIndex ?? data.length - 1

    ctx.beginPath()
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w
      const y = h - ((data[i].close - min) / range) * (h - 2) - 1
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = accentCyan
    ctx.lineWidth = 1
    ctx.stroke()

    const vpX = (curIdx / data.length) * w
    ctx.fillStyle = accentGreen
    ctx.fillRect(vpX - 1, 0, 2, h)
  }, [showOverview, data, currentIndex])

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false)
      if (playRef.current != null) { clearInterval(playRef.current); playRef.current = null }
      return
    }
    setPlaying(true)
  }, [playing])

  const stepBack = useCallback(() => {
    const prev = Math.max(0, indexRef.current - 1)
    indexRef.current = prev
    onSeek(prev)
  }, [onSeek])

  const stepForward = useCallback(() => {
    const next = Math.min(data.length - 1, indexRef.current + 1)
    indexRef.current = next
    onSeek(next)
  }, [data.length, onSeek])

  const jumpToStart = useCallback(() => {
    indexRef.current = 0
    onSeek(0)
  }, [onSeek])

  const jumpToEnd = useCallback(() => {
    indexRef.current = data.length - 1
    onSeek(data.length - 1)
  }, [data.length, onSeek])

  const jumpToCrash = useCallback(() => {
    const crashIdx = findCrashIndex(data)
    indexRef.current = crashIdx
    onSeek(crashIdx)
  }, [data, onSeek])

  const toggleBookmark = useCallback(() => {
    const cur = indexRef.current
    setBookmarks((prev) => {
      if (prev.includes(cur)) {
        const next = prev.filter((b) => b !== cur)
        saveBookmarks(next)
        return next
      }
      const next = [...prev, cur].sort((a, b) => a - b)
      saveBookmarks(next)
      return next
    })
  }, [])

  const jumpToBookmark = useCallback((idx: number) => {
    indexRef.current = idx
    onSeek(idx)
  }, [onSeek])

  useEffect(() => {
    if (!playing) return
    const ms = Math.max(50, 1000 / speed)
    playStartRef.current = Date.now()
    const MAX_PLAY_MS = 30000
    playRef.current = window.setInterval(() => {
      if (Date.now() - (playStartRef.current ?? 0) > MAX_PLAY_MS) {
        setPlaying(false)
        if (playRef.current != null) { clearInterval(playRef.current); playRef.current = null }
        return
      }
      const next = indexRef.current + 1
      if (next >= data.length) {
        setPlaying(false)
        if (playRef.current != null) { clearInterval(playRef.current); playRef.current = null }
        return
      }
      indexRef.current = next
      onSeek(next)
      if (synced && multiChartSync) multiChartSync.seekToIndex(next, data.length)
    }, ms)
    return () => {
      if (playRef.current != null) { clearInterval(playRef.current); playRef.current = null }
    }
  }, [playing, speed, data.length, onSeek, synced, multiChartSync])

  if (data.length === 0 || disabled) return null

  const lastTime = data[data.length - 1]?.time
  const curIdx = currentIndex != null ? Math.min(currentIndex, data.length - 1) : data.length - 1
  const curTime = data[curIdx]?.time ?? lastTime
  const pct = ((curIdx) / (data.length - 1)) * 100
  const isBookmarked = bookmarks.includes(curIdx)

  const formatTime = (t: number) => {
    const d = new Date(t * 1000)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const btnBase = {
    background: 'transparent', border: 'none', cursor: 'pointer' as const,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    width: 22, height: 22, borderRadius: 3,
    color: 'var(--text-muted)', transition: 'background 0.15s, color 0.15s',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 8px',
      borderTop: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      color: 'var(--text-secondary)',
      minHeight: 28,
    }}>
      <button onClick={togglePlay} disabled={curIdx >= data.length - 1}
        title={playing ? 'Stop' : 'Play'}
        style={{
          ...btnBase,
          background: playing ? 'color-mix(in srgb, var(--accent-red) 15%, transparent)' : 'color-mix(in srgb, var(--accent-blue) 15%, transparent)',
          color: playing ? 'var(--accent-red)' : 'var(--accent-blue)',
          opacity: curIdx >= data.length - 1 ? 0.4 : 1,
        }}
        onMouseEnter={(e) => { if (curIdx < data.length - 1) { e.currentTarget.style.background = playing ? 'color-mix(in srgb, var(--accent-red) 25%, transparent)' : 'color-mix(in srgb, var(--accent-blue) 25%, transparent)' } }}
        onMouseLeave={(e) => { e.currentTarget.style.background = playing ? 'color-mix(in srgb, var(--accent-red) 15%, transparent)' : 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' }}
      >
        {playing ? <Square size={11} /> : <Play size={11} />}
      </button>

      <button onClick={jumpToStart} title="Jump to start" style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <SkipBack size={11} />
      </button>
      <button onClick={stepBack} title="Step back" style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <SkipBack size={11} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <button onClick={stepForward} title="Step forward" style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <SkipForward size={11} />
      </button>
      <button onClick={jumpToEnd} title="Jump to end" style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <SkipForward size={11} style={{ transform: 'rotate(180deg)' }} />
      </button>

      <button onClick={jumpToCrash} title="Jump to high volatility"
        style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-red) 15%, transparent)'; e.currentTarget.style.color = 'var(--accent-red)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Flame size={11} />
      </button>

      <button onClick={toggleBookmark}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this position'}
        style={{ ...btnBase, color: isBookmarked ? 'var(--accent-yellow)' : 'var(--text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <Bookmark size={11} fill={isBookmarked ? 'var(--accent-yellow)' : 'none'} />
      </button>

      {bookmarks.length > 0 && (
        <select
          onChange={(e) => { const v = Number(e.target.value); if (v >= 0) jumpToBookmark(v) }}
          style={{
            background: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-muted)', fontSize: 8, padding: '1px 2px',
            fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', maxWidth: 60,
          }}
          value=""
        >
          <option value="" disabled>BOOKMARKS</option>
          {bookmarks.map((b) => (
            <option key={b} value={b}>{formatTime(data[b]?.time ?? 0)}</option>
          ))}
        </select>
      )}

      <div className="shrink-0" style={{ width: 1, height: 14, background: 'var(--border-color)' }} />

      {SPEEDS.map((s) => (
        <button key={s} onClick={() => setSpeed(s)}
          style={{
            background: speed === s ? 'var(--accent-cyan)' : 'transparent',
            border: 'none',
            color: speed === s ? '#000' : 'var(--text-muted)',
            cursor: 'pointer', padding: '1px 5px',
            fontSize: 8, borderRadius: 3,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: speed === s ? 700 : 400,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { if (speed !== s) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={(e) => { if (speed !== s) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
        >
          {s}x
        </button>
      ))}

      <div className="shrink-0" style={{ width: 1, height: 14, background: 'var(--border-color)' }} />

      <span style={{ color: 'var(--text-secondary)', fontSize: 9 }}>{formatTime(curTime)}</span>

      <input type="range" min={0} max={data.length - 1} value={curIdx}
        onChange={(e) => {
          const idx = Number(e.target.value)
          onSeek(idx)
          if (synced && multiChartSync) multiChartSync.seekToIndex(idx, data.length)
        }}
        className="flex-1"
        style={{ height: 3, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />

      <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
        {curIdx + 1} / {data.length}
      </span>

      <button onClick={() => setShowOverview(!showOverview)}
        title={showOverview ? 'Hide overview' : 'Show overview chart'}
        style={{ ...btnBase, color: showOverview ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <Eye size={11} />
      </button>

      <div style={{
        width: 60, height: 4, background: 'var(--border-color)', borderRadius: 2, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: pct + '%', background: 'var(--accent-cyan)', borderRadius: 2,
          transition: 'width 0.05s linear',
        }} />
      </div>

      {playing && <span style={{ color: 'var(--accent-red)', fontSize: 8, fontWeight: 600 }}>LIVE</span>}

      {showOverview && data.length > 1 && (
        <canvas ref={overviewCanvasRef}
          style={{ width: 120, height: 24, borderRadius: 2, border: '1px solid var(--border-color)' }} />
      )}

      {multiChartSync && multiChartSync.getChartCount() > 1 && (
        <>
          <div className="shrink-0" style={{ width: 1, height: 14, background: 'var(--border-color)' }} />
          <button onClick={onSyncAll} title={synced ? 'Synced' : 'Sync all charts'}
            style={{ ...btnBase, color: synced ? 'var(--accent-green)' : 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {synced ? <Zap size={11} /> : <ZapOff size={11} />}
          </button>
        </>
      )}
    </div>
  )
}
