import { useState, useEffect, useRef } from 'react'

interface VoteData {
  agent: string
  signal: string
  confidence: number
  reasoning: string
}

interface PersonaVoteAnimationProps {
  opinions: VoteData[]
  loading: boolean
}

function RadarChart({ bullish, bearish, neutral }: { bullish: number; bearish: number; neutral: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const total = bullish + bearish + neutral
  if (total === 0) return null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 120
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r = 45

    ctx.clearRect(0, 0, size, size)

    const segments = [
      { label: 'Bullish', count: bullish, color: '#22c55e', start: -Math.PI / 2 },
      { label: 'Bearish', count: bearish, color: '#ef4444', start: 0 },
      { label: 'Neutral', count: neutral, color: '#eab308', start: Math.PI / 2 },
    ]

    let currentAngle = -Math.PI / 2
    for (const seg of segments) {
      if (seg.count === 0) continue
      const sliceAngle = (seg.count / total) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = seg.color + '30'
      ctx.fill()
      ctx.strokeStyle = seg.color
      ctx.lineWidth = 1.5
      ctx.stroke()

      const midAngle = currentAngle + sliceAngle / 2
      const labelR = r * 0.6
      ctx.fillStyle = seg.color
      ctx.font = 'bold 12px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(seg.count), cx + Math.cos(midAngle) * labelR, cy + Math.sin(midAngle) * labelR)

      currentAngle += sliceAngle
    }

    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = 'var(--bg-card)'
    ctx.fill()
  }, [bullish, bearish, neutral])

  return <canvas ref={canvasRef} className="shrink-0" />
}

function TypewriterText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    indexRef.current = 0
    setDisplayed('')
    setDone(false)
    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
      } else {
        setDone(true)
        clearInterval(interval)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse text-blue-400">▌</span>}
    </span>
  )
}

function VoteBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(pct))
    return () => cancelAnimationFrame(raf)
  }, [pct])

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-14 text-right shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div
          className="h-full transition-all duration-700 ease-out rounded-sm"
          style={{ width: `${width}%`, background: color, opacity: 0.6 }}
        />
      </div>
      <span className="text-xs w-10 shrink-0 font-mono" style={{ color }}>{count}</span>
    </div>
  )
}

export default function PersonaVoteAnimation({ opinions, loading }: PersonaVoteAnimationProps) {
  const [visible, setVisible] = useState(false)
  const bullish = opinions.filter((o) => o.signal === 'bullish').length
  const bearish = opinions.filter((o) => o.signal === 'bearish').length
  const neutral = opinions.filter((o) => o.signal === 'neutral').length
  const total = opinions.length

  useEffect(() => {
    if (opinions.length > 0) {
      const timer = setTimeout(() => setVisible(true), 100)
      return () => clearTimeout(timer)
    }
    setVisible(false)
  }, [opinions.length])

  if (!visible && !loading) return null

  return (
    <div className="space-y-4 transition-all duration-500" style={{ opacity: visible ? 1 : 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Council Vote Distribution</div>
            <div className="flex items-center gap-4">
              <RadarChart bullish={bullish} bearish={bearish} neutral={neutral} />
              <div className="flex-1 space-y-2">
                <VoteBar label="Bullish" count={bullish} total={total} color="#22c55e" />
                <VoteBar label="Bearish" count={bearish} total={total} color="#ef4444" />
                <VoteBar label="Neutral" count={neutral} total={total} color="#eab308" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Verdict</div>
          {total > 0 && (() => {
            const netScore = (bullish - bearish) / total
            const verdict = netScore > 0.15 ? 'BULLISH' : netScore < -0.15 ? 'BEARISH' : 'NEUTRAL'
            const color = netScore > 0.15 ? '#22c55e' : netScore < -0.15 ? '#ef4444' : '#eab308'
            const avgConf = opinions.reduce((s, o) => s + o.confidence, 0) / total
            return (
              <div>
                <div className="text-2xl font-bold" style={{ color }}>{verdict}</div>
                <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {(Math.abs(netScore) * 100).toFixed(0)}% net · {(avgConf * 100).toFixed(0)}% avg confidence
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#22c55e20', color: '#22c55e' }}>{bullish} bullish</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{bearish} bearish</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#eab30820', color: '#eab308' }}>{neutral} neutral</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
