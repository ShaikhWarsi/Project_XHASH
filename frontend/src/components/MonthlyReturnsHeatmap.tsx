import { useRef, useEffect } from 'react'

interface Props {
  monthlyReturns: { year: number; month: number; return: number }[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function MonthlyReturnsHeatmap({ monthlyReturns }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || monthlyReturns.length === 0) return

    const years = [...new Set(monthlyReturns.map((r) => r.year))].sort()
    const z: number[][] = years.map((y) =>
      MONTHS.map((_, m) => {
        const found = monthlyReturns.find((r) => r.year === y && r.month === m + 1)
        return found ? found.return * 100 : 0
      })
    )

    import('plotly.js-dist-min').then((mod) => {
      const Plotly = (mod as any).default || mod
      if (!ref.current) return
      Plotly.newPlot(ref.current, [{
      z,
      x: MONTHS,
      y: years.map(String),
      type: 'heatmap',
      colorscale: [
        [0, '#ef5350'],
        [0.45, '#2a1a1a'],
        [0.5, '#0d1117'],
        [0.55, '#1a2a1a'],
        [1, '#22c55e'],
      ],
      zmid: 0,
      showscale: true,
      hovertemplate: '%{y}-%{x}: %{z:.2f}%<extra></extra>',
    }], {
      paper_bgcolor: '#0d1117',
      plot_bgcolor: '#0d1117',
      font: { color: '#5d6b7e', family: "'JetBrains Mono', monospace", size: 9 },
      margin: { l: 40, r: 60, t: 10, b: 40 },
      xaxis: { gridcolor: 'rgba(255,255,255,0.04)' },
      yaxis: { gridcolor: 'rgba(255,255,255,0.04)', autorange: 'reversed' },
    })
    })
  }, [monthlyReturns])

  return <div ref={ref} style={{ width: '100%', height: 260 }} />
}
