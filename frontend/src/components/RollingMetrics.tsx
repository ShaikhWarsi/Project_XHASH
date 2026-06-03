import { useRef, useEffect } from 'react'
import Plotly from 'plotly.js-dist-min'

interface Props {
  prices: { date: string; close: number }[]
}

function rollingMean(arr: number[], window: number): (number | null)[] {
  return arr.map((_, i) => {
    if (i < window - 1) return null
    const slice = arr.slice(i - window + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / window
  })
}

function rollingStd(arr: number[], window: number): (number | null)[] {
  return arr.map((_, i) => {
    if (i < window - 1) return null
    const slice = arr.slice(i - window + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / window
    const sqDiffs = slice.map((v) => (v - mean) ** 2)
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (window - 1))
  })
}

export default function RollingMetrics({ prices }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || prices.length < 252) return

    const dates = prices.map((p) => p.date)
    const returns = prices.map((p, i) => i === 0 ? 0 : (p.close / prices[i - 1].close - 1) * 100)

    const rollingSharpe = rollingMean(returns, 90).map((m, i) => {
      const s = rollingStd(returns, 90)[i]
      return m != null && s != null && s > 0 ? m / s : null
    })

    const mktReturns = returns
    const rollingBeta = rollingMean(returns, 252).map((_, i) => {
      if (i < 251) return null
      const sliceR = returns.slice(i - 251, i + 1)
      const sliceM = mktReturns.slice(i - 251, i + 1)
      const meanR = sliceR.reduce((a, b) => a + b, 0) / 252
      const meanM = sliceM.reduce((a, b) => a + b, 0) / 252
      let cov = 0, varM = 0
      for (let j = 0; j < 252; j++) {
        cov += (sliceR[j] - meanR) * (sliceM[j] - meanM)
        varM += (sliceM[j] - meanM) ** 2
      }
      return varM > 0 ? cov / varM : null
    })

    const rollingVol = rollingStd(returns, 21)?.map((s) => s != null ? s * Math.sqrt(252) : null)

    const sharpeTrace = {
      x: dates, y: rollingSharpe,
      type: 'scatter' as const, mode: 'lines' as const,
      name: 'Rolling Sharpe (90d)',
      line: { color: '#22c55e', width: 1.5 },
      yaxis: 'y' as const,
    }

    const betaTrace = {
      x: dates, y: rollingBeta,
      type: 'scatter' as const, mode: 'lines' as const,
      name: 'Rolling Beta (252d)',
      line: { color: '#3b82f6', width: 1.5 },
      yaxis: 'y2' as const,
    }

    const volTrace = {
      x: dates, y: rollingVol,
      type: 'scatter' as const, mode: 'lines' as const,
      name: 'Annualized Vol (21d)',
      line: { color: '#a855f7', width: 1.5 },
      yaxis: 'y3' as const,
    }

    Plotly.newPlot(ref.current, [sharpeTrace, betaTrace, volTrace], {
      paper_bgcolor: '#0d1117',
      plot_bgcolor: '#0d1117',
      font: { color: '#5d6b7e', family: "'JetBrains Mono', monospace", size: 9 },
      margin: { l: 40, r: 40, t: 20, b: 40 },
      legend: { font: { size: 9 } },
      grid: { rows: 3, columns: 1, pattern: 'independent' },
      yaxis: { domain: [0.68, 1], title: 'Sharpe', color: '#22c55e', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
      yaxis2: { domain: [0.34, 0.64], title: 'Beta', color: '#3b82f6', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
      yaxis3: { domain: [0, 0.3], title: 'Vol (ann)', color: '#a855f7', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
      xaxis: { gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
    })
  }, [prices])

  return <div ref={ref} style={{ width: '100%', height: 340 }} />
}
