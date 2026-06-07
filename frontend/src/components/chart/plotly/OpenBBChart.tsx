import { memo, useEffect, useRef } from 'react'

interface OpenBBChartProps {
  figureJSON: any
  style?: React.CSSProperties
}

function OpenBBChartInner({ figureJSON, style }: OpenBBChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotlyRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !figureJSON) return
    let cancelled = false
    const render = async () => {
      try {
        const mod = await import('plotly.js-dist-min')
        const Plotly = (mod as any).default || mod
        if (cancelled) return
        plotlyRef.current = Plotly
        const frames = figureJSON.frames || figureJSON.data?.frames
        const data = figureJSON.data || []
        const layout = figureJSON.layout || {}
        await Plotly.newPlot(containerRef.current, data, layout, {
          responsive: true, displayModeBar: false,
        })
      } catch { console.debug('[OpenBBChart] render failed') }
    }
    render()
    return () => { cancelled = true }
  }, [figureJSON])

  useEffect(() => {
    const handleResize = async () => {
      if (!plotlyRef.current || !containerRef.current) return
      try {
        const mod = plotlyRef.current || (await import('plotly.js-dist-min'))
        const Plotly = (mod as any).default || mod
        Plotly.Plots.resize(containerRef.current)
      } catch { console.debug('[OpenBBChart] resize failed') }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current) {
        try {
          import('plotly.js-dist-min').then((mod: any) => {
            const Plotly = mod.default || mod
            Plotly.purge(containerRef.current)
          })
        } catch { /* silent */ }
      }
    }
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', ...style }} />
  )
}

const OpenBBChart = memo(OpenBBChartInner)
export default OpenBBChart
