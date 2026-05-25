import { useEffect, useRef } from 'react'

interface OpenBBChartProps {
  figureJSON: { data: any[]; layout: any; config?: any } | null
  style?: React.CSSProperties
}

export default function OpenBBChart({ figureJSON, style }: OpenBBChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotlyRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !figureJSON) return

    let cancelled = false
    let plotlyImport: any = null

    async function render() {
      try {
        // @ts-ignore
        plotlyImport = await import('plotly.js-dist-min')
      } catch {
        return
      }
      if (cancelled || !containerRef.current) return
      const Plotly = plotlyImport
      const fig = figureJSON!

      const layout = {
        ...fig.layout,
        dragmode: 'zoom',
        hovermode: 'x unified',
        hoverdistance: 100,
        spikedistance: 100,
        hoverlabel: {
          bgcolor: '#0d1117',
          bordercolor: '#1a2332',
          font: { color: '#e6edf3', family: 'JetBrains Mono, monospace', size: 10 },
        },
        paper_bgcolor: '#0a0e14',
        plot_bgcolor: '#0a0e14',
        font: { color: '#8b95a5', family: 'JetBrains Mono, monospace' },
        margin: { l: 50, r: 10, b: 30, t: 30 },
        modebar: {
          orientation: 'h',
          bgcolor: 'rgba(10,14,20,0.9)',
          color: '#5d6b7e',
          activecolor: '#3b82f6',
        },
      }

      if (fig.layout?.xaxis) {
        layout.xaxis = {
          ...fig.layout.xaxis,
          rangeselector: undefined,
          rangeslider: undefined,
        }
      }

      for (const key of Object.keys(fig.layout || {})) {
        if (key.startsWith('xaxis') && key !== 'xaxis') {
          layout[key] = {
            ...fig.layout[key],
            rangeselector: undefined,
            rangeslider: undefined,
          }
        }
      }

      const config = {
        scrollZoom: true,
        displayModeBar: true,
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'],
        modeBarButtons: [
          ['zoom2d', 'pan2d'],
          ['zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
          ['hoverClosestCartesian', 'hoverCompareCartesian'],
          ['toggleSpikelines'],
        ],
      }

      if (plotlyRef.current) {
        await Plotly.react(containerRef.current, fig.data, layout, config)
      } else {
        plotlyRef.current = await Plotly.newPlot(containerRef.current, fig.data, layout, config)
      }
    }

    render()

    const handleResize = async () => {
      if (!plotlyRef.current || !containerRef.current) return
      try {
        const Plotly = plotlyImport || await import('plotly.js-dist-min')
        // @ts-ignore
        Plotly.Plots.resize(containerRef.current)
      } catch { /* ignore resize errors */ }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', handleResize)
      if (plotlyRef.current) {
        try {
          // @ts-ignore
          import('plotly.js-dist-min').then((Plotly) => {
            Plotly.purge(containerRef.current)
          })
        } catch { /* ignore purge errors */ }
        plotlyRef.current = null
      }
    }
  }, [figureJSON])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 400,
        ...style,
      }}
    />
  )
}
