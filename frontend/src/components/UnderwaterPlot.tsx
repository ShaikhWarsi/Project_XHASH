import { useRef, useEffect } from 'react'
import Plotly from 'plotly.js-dist-min'

interface Props {
  equityCurve: { date: string; value: number }[]
}

export default function UnderwaterPlot({ equityCurve }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || equityCurve.length < 2) return

    let peak = equityCurve[0].value
    const drawdowns = equityCurve.map((p) => {
      if (p.value > peak) peak = p.value
      return (p.value - peak) / peak
    })

    const dates = equityCurve.map((p) => p.date)
    const colors = drawdowns.map((dd) => dd < 0 ? 'rgba(239,83,80,0.6)' : 'rgba(38,166,154,0.1)')

    Plotly.newPlot(ref.current, [{
      x: dates, y: drawdowns.map((dd) => dd * 100),
      type: 'scatter', mode: 'lines',
      fill: 'tozeroy',
      fillcolor: 'rgba(239,83,80,0.2)',
      line: { color: '#ef5350', width: 1.5 },
      name: 'Drawdown %',
      hoverinfo: 'y',
    }], {
      paper_bgcolor: '#0d1117',
      plot_bgcolor: '#0d1117',
      font: { color: '#5d6b7e', family: "'JetBrains Mono', monospace", size: 9 },
      margin: { l: 50, r: 20, t: 20, b: 40 },
      yaxis: {
        title: 'Drawdown %', color: '#ef5350',
        gridcolor: 'rgba(255,255,255,0.04)', zeroline: true,
        zerolinecolor: 'rgba(239,83,80,0.3)',
      },
      xaxis: { gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
      showlegend: false,
    })
  }, [equityCurve])

  return <div ref={ref} style={{ width: '100%', height: 220 }} />
}
