import { useRef, useEffect } from 'react'
import { createChart, LineSeries, CandlestickSeries, type IChartApi, type CandlestickData } from 'lightweight-charts'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'

interface Props {
  symbol: string
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d']

function barsToCandles(bars: BarData[]): CandlestickData[] {
  return bars.map((b) => ({
    time: b.time as any,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }))
}

export default function MultiTimeframeRibbon({ symbol }: Props) {
  const containerRefs = useRef<(HTMLDivElement | null)[]>([])
  const chartRefs = useRef<(IChartApi | null)[]>([])

  useEffect(() => {
    for (const tf of TIMEFRAMES) {
      const idx = TIMEFRAMES.indexOf(tf)
      const el = containerRefs.current[idx]
      if (!el) continue

      const chart = createChart(el, {
        width: el.clientWidth,
        height: 56,
        layout: { background: { color: '#0d1117' }, textColor: '#5d6b7e' },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        timeScale: { visible: false },
        rightPriceScale: { visible: false },
        crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
        handleScroll: false,
        handleScale: false,
      })

      const range = tf === '1m' || tf === '5m' ? '1d' : tf === '15m' || tf === '1h' ? '5d' : tf === '4h' ? '1mo' : '6mo'
      const series = (chart as any).addSeries('Line', { color: '#3b82f6', lineWidth: 1 })
      series.setData([{ time: 0 as any, value: 0 }])

      fetchOHLCV(symbol, tf, range).then((bars) => {
        if (bars && bars.length > 0) {
          const d = barsToCandles(bars).map((b) => ({ time: b.time, value: b.close }))
          series.setData(d)
          chart.timeScale().fitContent()
        }
      })

      chartRefs.current[idx] = chart
    }

    return () => {
      for (const c of chartRefs.current) {
        c?.remove()
      }
      chartRefs.current = []
    }
  }, [symbol])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
      {TIMEFRAMES.map((tf, i) => (
        <div key={tf}
          ref={(el) => { containerRefs.current[i] = el }}
          style={{
            height: 60, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 2, overflow: 'hidden', position: 'relative',
          }}>
          <span style={{
            position: 'absolute', top: 2, left: 4, fontSize: 7, color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono', monospace", zIndex: 1,
          }}>
            {tf}
          </span>
        </div>
      ))}
    </div>
  )
}
