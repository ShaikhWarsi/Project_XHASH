import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import Skeleton from '../components/Skeleton'
import { getStrategy, type StrategyEntry } from '../api/strategyPortfolio'

function PayoffChart({ legs }: { legs: StrategyEntry['legs'] }) {
  const [chartError, setChartError] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    import('plotly.js-dist-min').then((m) => { const Plotly = m as unknown as { newPlot: Function };
      const strikes = Array.from({ length: 50 }, (_, i) => {
        const minStrike = Math.min(...legs.map((l) => l.strike))
        const maxStrike = Math.max(...legs.map((l) => l.strike))
        const range = (maxStrike - minStrike) * 1.5 || 100
        return minStrike - range * 0.3 + (i / 49) * range * 1.6
      })

      const payoff = strikes.map((s) => {
        return legs.reduce((total, leg) => {
          const isCall = leg.type === 'call'
          const isBuy = leg.action === 'buy'
          const intrinsic = isCall ? Math.max(s - leg.strike, 0) : Math.max(leg.strike - s, 0)
          const multiplier = isBuy ? 1 : -1
          return total + (intrinsic - leg.price) * leg.quantity * multiplier
        }, 0)
      })

      const el = document.getElementById('payoff-chart')
      if (!el) return

      Plotly.newPlot(
        el,
        [
          {
            x: strikes,
            y: payoff,
            type: 'scatter',
            mode: 'lines',
            name: 'Payoff',
            line: { color: '#3b82f6', width: 2 },
            fill: 'tozeroy',
            fillcolor: 'rgba(59, 130, 246, 0.1)',
          },
        ],
        {
          title: 'Strategy Payoff Diagram',
          xaxis: { title: 'Underlying Price' },
          yaxis: { title: 'P&L' },
          margin: { l: 50, r: 20, t: 40, b: 40 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          hovermode: 'x',
        },
        { responsive: true },
      )
    }).catch(() => setChartError(true))
  }, [legs])

  if (chartError) {
    return <div className="text-sm text-gray-500">Chart library unavailable</div>
  }

  return <div id="payoff-chart" className="w-full h-[300px]" />
}

export default function StrategyPortfolioView() {
  const { id } = useParams<{ id: string }>()
  const [strategy, setStrategy] = useState<StrategyEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getStrategy(Number(id))
      .then(setStrategy)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton height={24} width="40%" />
        <Skeleton height={200} />
      </div>
    )
  }

  if (!strategy) {
    return <div className="p-4 text-gray-500">Strategy not found</div>
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{strategy.name}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-3">
          <div className="text-xs text-gray-500">Underlying</div>
          <div className="font-semibold">{strategy.underlying}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-500">Exchange</div>
          <div className="font-semibold">{strategy.exchange}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-500">Watchlist</div>
          <div className="font-semibold capitalize">{strategy.watchlist}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-500">Expiry</div>
          <div className="font-semibold">{strategy.expiry ?? 'N/A'}</div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Legs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Action</th>
                <th className="text-right py-2">Strike</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {strategy.legs.map((leg, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 capitalize">{leg.type}</td>
                  <td className="py-2 capitalize">
                    <span className={leg.action === 'buy' ? 'text-green-600' : 'text-red-600'}>{leg.action}</span>
                  </td>
                  <td className="text-right py-2">{leg.strike}</td>
                  <td className="text-right py-2">{leg.quantity}</td>
                  <td className="text-right py-2">{leg.price}</td>
                  <td className="text-right py-2 font-medium">{leg.quantity * leg.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {strategy.legs.length > 0 && (
        <Card className="p-4">
          <PayoffChart legs={strategy.legs} />
        </Card>
      )}

      {strategy.notes && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-2">Notes</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{strategy.notes}</p>
        </Card>
      )}
    </div>
  )
}
