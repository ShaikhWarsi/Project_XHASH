import { useEffect, useRef, useMemo } from 'react'

interface CorrelationData {
  symbols: string[]
  matrix: number[][]
}

interface CorrelationHeatmapProps {
  data: CorrelationData
  height?: number
}

const DIVERGING_COLORS = [
  '#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0',
  '#f7f7f7',
  '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f',
]

export default function CorrelationHeatmap({ data, height = 500 }: CorrelationHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)

  const traceData = useMemo(() => {
    const { symbols, matrix } = data
    const z: number[][] = []
    const hovertext: string[][] = []
    for (let i = 0; i < symbols.length; i++) {
      const row: number[] = []
      const hoverRow: string[] = []
      for (let j = 0; j < symbols.length; j++) {
        const val = matrix[i]?.[j] ?? 0
        row.push(parseFloat(val.toFixed(4)))
        hoverRow.push(`${symbols[i]} / ${symbols[j]}<br>r = ${val.toFixed(4)}`)
      }
      z.push(row)
      hovertext.push(hoverRow)
    }
    return { z, hovertext }
  }, [data])

  useEffect(() => {
    if (!containerRef.current || data.symbols.length === 0) return

    const Plotly = (window as any).Plotly
    if (!Plotly) {
      import('plotly.js-dist-min').then((mod) => {
        renderChart(mod.default || mod)
      })
      return
    }
    renderChart(Plotly)

    function renderChart(Plotly: any) {
      const container = containerRef.current!
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
      const textColor = isDark ? '#e8eaed' : '#212121'
      const bgColor = isDark ? '#0d1117' : '#ffffff'
      const gridColor = isDark ? '#1a2332' : '#e0e0e0'

      const layout = {
        paper_bgcolor: bgColor,
        plot_bgcolor: bgColor,
        font: { color: textColor, size: 11, family: 'JetBrains Mono, monospace' },
        margin: { l: 60, r: 60, b: 60, t: 10, pad: 4 },
        xaxis: {
          tickvals: data.symbols.map((_, i) => i),
          ticktext: data.symbols,
          tickangle: -45,
          side: 'top',
          gridcolor: gridColor,
          linecolor: gridColor,
          zerolinecolor: gridColor,
        },
        yaxis: {
          tickvals: data.symbols.map((_, i) => i),
          ticktext: data.symbols,
          gridcolor: gridColor,
          linecolor: gridColor,
          zerolinecolor: gridColor,
          autorange: 'reversed' as any,
        },
        width: container.clientWidth,
        height,
      }

      const trace = {
        z: traceData.z,
        x: data.symbols.map((_, i) => i),
        y: data.symbols.map((_, i) => i),
        xgap: 1,
        ygap: 1,
        type: 'heatmap' as const,
        colorscale: [
          [0, DIVERGING_COLORS[0]],
          [0.1, DIVERGING_COLORS[1]],
          [0.2, DIVERGING_COLORS[2]],
          [0.3, DIVERGING_COLORS[3]],
          [0.4, DIVERGING_COLORS[4]],
          [0.5, DIVERGING_COLORS[5]],
          [0.6, DIVERGING_COLORS[6]],
          [0.7, DIVERGING_COLORS[7]],
          [0.8, DIVERGING_COLORS[8]],
          [0.9, DIVERGING_COLORS[9]],
          [1, DIVERGING_COLORS[10]],
        ] as any,
        zmin: -1,
        zmax: 1,
        zmid: 0,
        text: traceData.hovertext,
        hoverinfo: 'text' as any,
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

      try {
        if (chartRef.current) {
          Plotly.react(container, [trace], layout, { responsive: true, displayModeBar: false })
        } else {
          Plotly.newPlot(container, [trace], layout, { responsive: true, displayModeBar: false })
        }
        chartRef.current = container
      } catch {}

      const ro = new ResizeObserver(() => {
        Plotly.Plots.resize(container)
      })
      ro.observe(container!)
      return () => ro.disconnect()
    }

    return () => {
      if (chartRef.current) {
        try {
          const Plotly = (window as any).Plotly
          Plotly?.purge?.(chartRef.current)
        } catch {}
        chartRef.current = null
      }
    }
  }, [data, height, traceData])

  if (data.symbols.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        color: 'var(--text-secondary)',
      }}>
        No correlation data available
      </div>
    )
  }

  return <div ref={containerRef} style={{ width: '100%', height }} />
}
