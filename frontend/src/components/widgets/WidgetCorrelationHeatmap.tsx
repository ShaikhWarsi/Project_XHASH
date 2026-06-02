import { useEffect, useRef } from 'react'

interface CorrelationHeatmapProps {
  data: {
    symbols: string[]
    correlations: number[][]
  }
  timeframe?: string
  onCellClick?: (symbol1: string, symbol2: string, correlation: number) => void
}

export default function WidgetCorrelationHeatmap({
  data,
  timeframe = '1D',
  onCellClick,
}: CorrelationHeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || data.symbols.length === 0) return

    const Plotly = (window as unknown as Record<string, unknown>).Plotly as Record<string, unknown> | undefined

    function renderChart(mod: Record<string, unknown>) {
      const container = chartRef.current!
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
      const textColor = isDark ? '#e8eaed' : '#212121'
      const gridColor = isDark ? '#1a2332' : '#e0e0e0'

      const z = data.correlations.map((row, i) =>
        row.map((val, j) => {
          const v = data.correlations[i]?.[j] ?? 0
          return parseFloat(v.toFixed(4))
        })
      )

      const hovertext = data.correlations.map((row, i) =>
        row.map((_, j) => {
          const val = data.correlations[i]?.[j] ?? 0
          return `${data.symbols[i]} / ${data.symbols[j]}<br>r = ${val.toFixed(4)}`
        })
      )

      const trace = {
        z,
        x: data.symbols,
        y: data.symbols,
        type: 'heatmap' as const,
        colorscale: [
          [0, '#053061'],
          [0.1, '#2166ac'],
          [0.2, '#4393c3'],
          [0.3, '#92c5de'],
          [0.4, '#d1e5f0'],
          [0.5, '#f7f7f7'],
          [0.6, '#fddbc7'],
          [0.7, '#f4a582'],
          [0.8, '#d6604d'],
          [0.9, '#b2182b'],
          [1, '#67001f'],
        ] as unknown as [number, string][],
        zmin: -1,
        zmax: 1,
        zmid: 0,
        text: hovertext,
        hoverinfo: 'text' as const,
        hovertemplate: '%{text}<extra></extra>',
        showscale: true,
        colorbar: {
          title: { text: 'r', font: { color: textColor, size: 10 } },
          tickfont: { color: textColor, size: 10 },
          thickness: 15,
          len: 0.7,
          tickvals: [-1, -0.5, 0, 0.5, 1],
        },
      }

      const layout = {
        title: {
          text: `Correlation Heatmap (${timeframe})`,
          font: { color: textColor, size: 14 },
        },
        paper_bgcolor: isDark ? '#0d1117' : '#ffffff',
        plot_bgcolor: isDark ? '#0d1117' : '#ffffff',
        font: { color: textColor, size: 11, family: 'JetBrains Mono, monospace' },
        margin: { l: 80, r: 60, b: 80, t: 50, pad: 4 },
        xaxis: {
          tickvals: data.symbols.map((_, i) => i),
          ticktext: data.symbols,
          tickangle: -45,
          side: 'top',
          gridcolor: gridColor,
        },
        yaxis: {
          tickvals: data.symbols.map((_, i) => i),
          ticktext: data.symbols,
          gridcolor: gridColor,
          autorange: 'reversed' as const,
        },
        width: container.clientWidth,
        height: 500,
      }

      try {
        ;(mod as Record<string, unknown>).newPlot(container, [trace], layout, {
          responsive: true,
          displayModeBar: false,
        })
      } catch {
        /* ignore render errors */
      }

      if (onCellClick) {
        container.on('plotly_click', (eventData: unknown) => {
          const pts = (eventData as Record<string, unknown>).points as Array<Record<string, unknown>> | undefined
          if (pts && pts.length > 0) {
            const x = pts[0].x as number
            const y = pts[0].y as number
            onCellClick(data.symbols[x], data.symbols[y], data.correlations[y]?.[x] ?? 0)
          }
        })
      }
    }

    if (Plotly && typeof Plotly.newPlot === 'function') {
      renderChart(Plotly as Record<string, unknown>)
    } else {
      import('plotly.js-dist-min').then((mod) => {
        renderChart(mod.default || mod)
      })
    }

    const el = chartRef.current
    return () => {
      if (!el) return
      try {
        const Plotly = (window as unknown as Record<string, unknown>).Plotly as Record<string, unknown> | undefined
        if (Plotly && typeof Plotly.purge === 'function') {
          ;(Plotly as Record<string, unknown>).purge(el)
        }
      } catch {
        /* ignore cleanup errors */
      }
    }
  }, [data, timeframe, onCellClick])

  if (data.symbols.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 500, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        color: 'var(--text-secondary)',
      }}>
        No correlation data available
      </div>
    )
  }

  return <div ref={chartRef} style={{ width: '100%', height: 500 }} />
}
