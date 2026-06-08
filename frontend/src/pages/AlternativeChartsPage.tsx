import { useState, useMemo, useEffect } from 'react'
import Card from '../components/ui/Card'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'

const TYPES = ['Renko', 'Kagi', 'Range', 'Point & Figure', 'Heikin-Ashi', 'Three-Line Break', 'Market Profile']

export default function AlternativeChartsPage() {
  const [selected, setSelected] = useState('Renko')
  const [symbol, setSymbol] = useState('SPY')
  const [bars, setBars] = useState<BarData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchOHLCV(symbol, '1d', '6mo')
      .then(data => { setBars(data || []); setLoading(false) })
      .catch(() => { setBars([]); setLoading(false) })
  }, [symbol])

  const realCandles = useMemo(() => {
    return bars.map(b => ({
      time: new Date(b.time * 1000).toISOString().split('T')[0],
      o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume ?? 0,
    }))
  }, [bars])

  const altData = useMemo(() => {
    if (!realCandles.length) return []
    switch (selected) {
      case 'Renko': return realCandles.map((c, i) => ({ x: i + 1, y: Math.round(c.c / 2) * 2, color: c.c >= c.o ? '#22c55e' : '#ef4444' }))
      case 'Heikin-Ashi': {
        let haOpen = realCandles[0]?.o ?? 100
        return realCandles.map((c) => {
          const haClose = (c.o + c.h + c.l + c.c) / 4
          const haHigh = Math.max(c.h, haOpen, haClose)
          const haLow = Math.min(c.l, haOpen, haClose)
          const r = { o: haOpen, c: haClose, h: haHigh, l: haLow, up: haClose >= haOpen }
          haOpen = (haOpen + haClose) / 2
          return r
        })
      }
      case 'Kagi': {
        let trend: 'yang' | 'yin' = 'yang'; let current = realCandles[0]?.c ?? 100
        const reversal = 3; const lines: { price: number; yang: boolean }[] = [{ price: current, yang: true }]
        for (const c of realCandles) {
          const diff = c.c - current
          if (trend === 'yang' && diff < -reversal) { trend = 'yin'; lines.push({ price: c.c, yang: false }) }
          else if (trend === 'yin' && diff > reversal) { trend = 'yang'; lines.push({ price: c.c, yang: true }) }
          current = c.c
        }
        return lines
      }
      case 'Market Profile': {
        const min = Math.min(...realCandles.map(c => c.l))
        const max = Math.max(...realCandles.map(c => c.h))
        const step = (max - min) / 20
        const buckets: { price: number; tpo: string[] }[] = []
        for (let i = 0; i < 20; i++) {
          const base = min + i * step
          const tpoLetters: string[] = []
          for (let j = 0; j < realCandles.length; j++) {
            const c = realCandles[j]
            if (c.h >= base && c.l <= base + step) tpoLetters.push(String.fromCharCode(65 + (Math.floor(j / 4) % 26)))
          }
          buckets.push({ price: base, tpo: tpoLetters })
        }
        return buckets
      }
      default: return []
    }
  }, [selected, realCandles])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="ALTERNATIVE CHART TYPES">
        <div className="flex items-center gap-2 mb-2">
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && setSymbol(e.target.value.toUpperCase())}
            className="bg-secondary border border-default rounded px-2 py-1 text-[10px] font-mono-data text-primary w-24" placeholder="Symbol" />
          <div className="flex flex-wrap gap-1">
            {TYPES.map(t => (
              <button key={t} onClick={() => setSelected(t)}
                className="text-[9px] font-mono-data px-2 py-0.5 cursor-pointer rounded-sm border transition-colors"
                style={{ background: selected === t ? 'var(--accent-blue)' : 'var(--bg-card)', color: selected === t ? '#fff' : 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                {t}
              </button>
            ))}
          </div>
          {loading && <span className="text-[9px] text-muted animate-pulse ml-auto">Loading {symbol}...</span>}
        </div>

        <div className="relative overflow-auto" style={{ height: 450, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 4 }}>
          {selected === 'Renko' && (
            <svg width="100%" height={400} viewBox="0 0 500 400" preserveAspectRatio="xMidYMid meet" className="p-2">
              {altData.map((d: any, i) => (
                d.y != null ? <rect key={i} x={20 + i * 5} y={350 - (d.y - 80) * 3} width={4} height={3} fill={d.color} rx={0.5} /> : null
              ))}
            </svg>
          )}
          {selected === 'Heikin-Ashi' && (
            <svg width="100%" height={400} viewBox="0 0 500 400" preserveAspectRatio="xMidYMid meet" className="p-2">
              {(altData as any[]).map((c, i) => {
                const x = 20 + i * 5; const yOpen = 350 - (c.o - 80) * 3; const yClose = 350 - (c.c - 80) * 3
                const yHigh = 350 - (c.h - 80) * 3; const yLow = 350 - (c.l - 80) * 3
                const bodyTop = Math.min(yOpen, yClose); const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1)
                return (
                  <g key={i}>
                    <line x1={x + 2} y1={yHigh} x2={x + 2} y2={yLow} stroke={c.up ? '#22c55e' : '#ef4444'} strokeWidth={1} />
                    <rect x={x} y={bodyTop} width={4} height={bodyHeight} fill={c.up ? '#22c55e' : '#ef4444'} opacity={0.8} rx={0.5} />
                  </g>
                )
              })}
            </svg>
          )}
          {selected === 'Kagi' && (
            <svg width="100%" height={400} viewBox="0 0 500 400" preserveAspectRatio="xMidYMid meet" className="p-2">
              {(altData as any[]).map((line: any, i: number) => {
                if (i === 0) return null
                const prev = (altData as any[])[i - 1]; const x1 = 20 + (i - 1) * 8; const x2 = 20 + i * 8; const y1 = 350 - (prev.price - 80) * 3; const y2 = 350 - (line.price - 80) * 3
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={line.yang ? '#22c55e' : '#ef4444'} strokeWidth={line.yang ? 2 : 4} opacity={0.8} />
              })}
            </svg>
          )}
          {selected === 'Market Profile' && (
            <div className="p-3 overflow-auto" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, lineHeight: 1.3 }}>
              {(altData as any[]).slice().reverse().map((b: any) => (
                <div key={b.price} className="flex items-center gap-1" style={{ height: 12 }}>
                  <span style={{ width: 45, textAlign: 'right', color: '#8892a6', flexShrink: 0 }}>{b.price.toFixed(1)}</span>
                  <span style={{ color: '#e2e8f0', letterSpacing: '1px' }}>{b.tpo.join('')}</span>
                </div>
              ))}
            </div>
          )}
          {(['Range', 'Point & Figure', 'Three-Line Break'] as const).includes(selected as any) && (
            <div className="flex items-center justify-center h-full text-[10px] font-mono-data text-muted">
              [{selected} chart — {realCandles.length} real bars loaded from {symbol}]
            </div>
          )}
          {realCandles.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full text-[10px] font-mono-data text-muted">No data available for {symbol}</div>
          )}
        </div>
      </Card>
    </div>
  )
}
