import { useEffect, useRef } from 'react'

interface Trade {
  entryTime: number
  exitTime: number
  entryPrice: number
  exitPrice: number
  size: number
  side: 'long' | 'short'
  pnl: number
}

interface Props {
  equityCurve: number[]
  trades: Trade[]
  timestamps: number[]
  height?: number
}

export default function TradeRibbon({ equityCurve, trades, timestamps, height = 120 }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)

  useEffect(() => {
    if (rendered.current || !chartRef.current || equityCurve.length === 0) return
    rendered.current = true

    import('plotly.js-dist-min').then(Plotly => {
      if (!chartRef.current) return

      const trace = {
        x: timestamps,
        y: equityCurve,
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: { color: '#3b82f6', width: 2 },
        name: 'Equity',
        fill: 'tozeroy' as const,
        fillcolor: 'rgba(59,130,246,0.1)',
      }

      const traces: any[] = [trace]

      if (trades.length > 0) {
        const buyTrace = {
          x: trades.filter(t => t.side === 'long').map(t => t.entryTime),
          y: trades.filter(t => t.side === 'long').map((t, i) => {
            const idx = timestamps.findIndex(ts => ts >= t.entryTime)
            return idx >= 0 ? equityCurve[idx] : null
          }).filter(v => v !== null),
          mode: 'markers' as const,
          type: 'scatter' as const,
          marker: { color: '#22c55e', size: 6, symbol: 'triangle-up' },
          name: 'Long Entry',
        }
        const sellTrace = {
          x: trades.filter(t => t.side === 'short').map(t => t.entryTime),
          y: trades.filter(t => t.side === 'short').map((t, i) => {
            const idx = timestamps.findIndex(ts => ts >= t.entryTime)
            return idx >= 0 ? equityCurve[idx] : null
          }).filter(v => v !== null),
          mode: 'markers' as const,
          type: 'scatter' as const,
          marker: { color: '#ef4444', size: 6, symbol: 'triangle-down' },
          name: 'Short Entry',
        }
        traces.push(buyTrace, sellTrace)
      }

      const config = {
        responsive: true,
        displayModeBar: false,
        dragmode: false as const,
      }

      const plotLayout = {
        height,
        margin: { t: 10, b: 20, l: 40, r: 10 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#8b949e', size: 9, family: 'JetBrains Mono, monospace' },
        xaxis: { visible: false, gridcolor: 'rgba(255,255,255,0.05)' },
        yaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.1)' },
        showlegend: trades.length > 0,
        legend: { font: { size: 8 }, orientation: 'h', y: 1.1 },
      } as any

      (Plotly as any).newPlot(chartRef.current, traces, plotLayout, config)
    })
  }, [equityCurve, trades, timestamps, height])

  return <div ref={chartRef} style={{ width: '100%', height }} />
}
