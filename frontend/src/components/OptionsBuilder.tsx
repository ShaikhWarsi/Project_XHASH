import { useState, useEffect, useRef } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'

interface Leg {
  type: 'call' | 'put'
  action: 'buy' | 'sell'
  strike: number
  expiry: string
  quantity: number
}

function payoffAt(legs: Leg[], price: number): number {
  return legs.reduce((sum, leg) => {
    const intrinsic = leg.type === 'call'
      ? Math.max(0, price - leg.strike)
      : Math.max(0, leg.strike - price)
    return sum + (leg.action === 'buy' ? 1 : -1) * intrinsic * leg.quantity * 100
  }, 0)
}

export default function OptionsBuilder() {
  const [legs, setLegs] = useState<Leg[]>([
    { type: 'call', action: 'buy', strike: 100, expiry: '2025-06-20', quantity: 1 },
  ])
  const payoffRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'builder' | 'scenario'>('builder')
  const [shockPrice, setShockPrice] = useState(100)
  const [shockVol, setShockVol] = useState(20)
  const [shockRate, setShockRate] = useState(5)

  const addLeg = () => {
    const last = legs[legs.length - 1]
    setLegs([...legs, { type: 'call', action: 'buy', strike: (last?.strike ?? 100) + 5, expiry: last?.expiry ?? '2025-06-20', quantity: 1 }])
  }

  const updateLeg = (i: number, field: keyof Leg, value: string | number) => {
    const copy = [...legs]
    ;(copy[i] as any)[field] = value
    setLegs(copy)
  }

  const removeLeg = (i: number) => setLegs(legs.filter((_, idx) => idx !== i))

  useEffect(() => {
    if (!payoffRef.current || legs.length === 0) return
    let cancelled = false
    import('plotly.js-dist-min').then((mod: any) => {
      if (cancelled) return
      const atm = legs.reduce((s, l) => s + l.strike, 0) / legs.length
      const prices = Array.from({ length: 200 }, (_, i) => atm * 0.5 + (atm * 1.5 - atm * 0.5) * i / 199)
      const payoffs = prices.map((p) => payoffAt(legs, p))
      const zeroLine = prices.map(() => 0)
      const breakevens = prices.filter((p, i) => i > 0 && payoffs[i - 1] * payoffs[i] <= 0).slice(0, 4)

      mod.newPlot(payoffRef.current, [
        { x: prices, y: payoffs, type: 'scatter', mode: 'lines', name: 'Payoff', line: { color: '#3b82f6', width: 2 }, fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.1)' },
        { x: prices, y: zeroLine, type: 'scatter', mode: 'lines', name: 'Breakeven', line: { color: '#ef4444', width: 1, dash: 'dash' } },
        ...breakevens.map((be, i) => ({
          x: [be, be], y: [Math.min(...payoffs), Math.max(...payoffs)],
          type: 'scatter' as const, mode: 'lines' as const,
          name: `BE ${i + 1}`, line: { color: '#22c55e', width: 1, dash: 'dot' },
          showlegend: false,
        })),
      ], {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 50, r: 20, t: 10, b: 30 }, height: 250,
        xaxis: { title: 'Price at Expiry', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
        yaxis: { title: 'P&L ($)', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
        legend: { font: { color: '#999', size: 8 }, orientation: 'h', y: 1.08 },
        hovermode: 'x unified',
      })
    })
    return () => { cancelled = true }
  }, [legs])

  const strategyPresets: { name: string; legs: Leg[] }[] = [
    { name: 'Long Call', legs: [{ type: 'call', action: 'buy', strike: 100, expiry: '2025-06-20', quantity: 1 }] },
    { name: 'Bull Call Spread', legs: [{ type: 'call', action: 'buy', strike: 100, expiry: '2025-06-20', quantity: 1 }, { type: 'call', action: 'sell', strike: 110, expiry: '2025-06-20', quantity: 1 }] },
    { name: 'Iron Condor', legs: [{ type: 'put', action: 'sell', strike: 90, expiry: '2025-06-20', quantity: 1 }, { type: 'put', action: 'buy', strike: 85, expiry: '2025-06-20', quantity: 1 }, { type: 'call', action: 'sell', strike: 110, expiry: '2025-06-20', quantity: 1 }, { type: 'call', action: 'buy', strike: 115, expiry: '2025-06-20', quantity: 1 }] },
    { name: 'Risk Reversal', legs: [{ type: 'put', action: 'sell', strike: 95, expiry: '2025-06-20', quantity: 1 }, { type: 'call', action: 'buy', strike: 105, expiry: '2025-06-20', quantity: 1 }] },
    { name: 'Butterfly', legs: [{ type: 'call', action: 'buy', strike: 95, expiry: '2025-06-20', quantity: 1 }, { type: 'call', action: 'sell', strike: 100, expiry: '2025-06-20', quantity: 2 }, { type: 'call', action: 'buy', strike: 105, expiry: '2025-06-20', quantity: 1 }] },
  ]

  const atm = legs.length > 0 ? legs.reduce((s, l) => s + l.strike, 0) / legs.length : 100
  const maxProfit = Math.max(...Array.from({ length: 200 }, (_, i) => payoffAt(legs, atm * 0.5 + (atm * 1.5 - atm * 0.5) * i / 199)))
  const maxLoss = Math.min(...Array.from({ length: 200 }, (_, i) => payoffAt(legs, atm * 0.5 + (atm * 1.5 - atm * 0.5) * i / 199)))

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1 flex-wrap">
        <Badge label="OPTIONS" variant="info" />
        {(['builder', 'scenario'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', border: 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t === 'builder' ? 'STRATEGY BUILDER' : 'SCENARIO'}
          </button>
        ))}
      </div>

      {tab === 'builder' && (
        <div className="grid grid-cols-2 gap-1.5">
          <Card title="LEGS" actions={
            <div className="flex gap-1">
              <button onClick={addLeg} className="font-mono-data text-[9px] px-2 py-0.5 cursor-pointer" style={{ background: 'rgba(59,130,246,0.15)', border: 'none', color: 'var(--accent-blue)' }}>+ LEG</button>
            </div>
          }>
            <div className="flex flex-col gap-1">
              <div className="flex gap-1 flex-wrap">
                {strategyPresets.map((p) => (
                  <button key={p.name} onClick={() => setLegs(p.legs)}
                    className="font-mono-data text-[9px] px-1.5 py-0.5 cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    {p.name}
                  </button>
                ))}
              </div>
              {legs.map((leg, i) => (
                <div key={i} className="flex gap-1 items-center font-mono-data text-[10px]" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                  <select value={leg.type} onChange={(e) => updateLeg(i, 'type', e.target.value)}
                    className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary">
                    <option value="call">CALL</option><option value="put">PUT</option>
                  </select>
                  <select value={leg.action} onChange={(e) => updateLeg(i, 'action', e.target.value)}
                    className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary">
                    <option value="buy">BUY</option><option value="sell">SELL</option>
                  </select>
                  <input type="number" value={leg.strike} onChange={(e) => updateLeg(i, 'strike', +e.target.value)}
                    className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary" style={{ width: 60 }} />
                  <input type="date" value={leg.expiry} onChange={(e) => updateLeg(i, 'expiry', e.target.value)}
                    className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary" style={{ width: 100 }} />
                  <input type="number" value={leg.quantity} onChange={(e) => updateLeg(i, 'quantity', +e.target.value)}
                    className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary" style={{ width: 40 }} />
                  <button onClick={() => removeLeg(i)} className="text-accent-red font-mono-data text-[10px] cursor-pointer" style={{ background: 'none', border: 'none' }}>X</button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="PAYOFF DIAGRAM">
            <div ref={payoffRef} />
            <div className="flex gap-2 mt-1 font-mono-data text-[10px] text-muted">
              <span>Max Profit: <span className="text-accent-green">${maxProfit.toFixed(0)}</span></span>
              <span>Max Loss: <span className="text-accent-red">${maxLoss.toFixed(0)}</span></span>
              <span>Risk/Reward: <span className="text-primary">{maxLoss !== 0 ? (maxProfit / Math.abs(maxLoss)).toFixed(2) : '∞'}</span></span>
            </div>
          </Card>
        </div>
      )}

      {tab === 'scenario' && (
        <Card title="SCENARIO ANALYSIS">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="font-mono-data text-[10px]">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between"><span>Underlying</span><span className="text-primary">${(atm).toFixed(2)}</span></div>
                <div className="flex justify-between items-center">
                  <span>Shock Price</span>
                  <input type="range" min={atm * 0.5} max={atm * 1.5} step={0.5} value={shockPrice}
                    onChange={(e) => setShockPrice(+e.target.value)}
                    className="w-24" />
                  <span className="text-primary">{shockPrice > atm ? '+' : ''}{((shockPrice / atm - 1) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Vol Shock</span>
                  <input type="range" min={5} max={80} step={1} value={shockVol}
                    onChange={(e) => setShockVol(+e.target.value)}
                    className="w-24" />
                  <span className="text-primary">{shockVol}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Rate Shock</span>
                  <input type="range" min={0} max={10} step={0.25} value={shockRate}
                    onChange={(e) => setShockRate(+e.target.value)}
                    className="w-24" />
                  <span className="text-primary">{shockRate}%</span>
                </div>
                <div className="mt-2 p-1" style={{ background: 'var(--border-color)' }}>
                  <div className="text-[9px] text-muted">Scenario Impact</div>
                  <div className="text-primary">P&L: <span className="text-accent-green">+${(payoffAt(legs, shockPrice)).toFixed(0)}</span></div>
                  <div className="text-primary">New Price: <span className="text-primary">${shockPrice.toFixed(2)}</span></div>
                  <div className="text-primary">Vol: <span className="text-primary">{shockVol}%</span></div>
                  <div className="text-primary">Rates: <span className="text-primary">{shockRate}%</span></div>
                </div>
              </div>
            </div>

            <div className="col-span-2 font-mono-data text-[10px]">
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Scenario</th><th className="text-right">Underlying</th><th className="text-right">Vol</th><th className="text-right">Rates</th><th className="text-right">P&L</th><th className="text-right">Return</th></tr></thead>
                <tbody>
                  {[
                    { n: 'Bull Case (+20%)', p: atm * 1.2, v: 18, r: 4.5 },
                    { n: 'Base Case', p: atm, v: 20, r: 5.0 },
                    { n: 'Bear Case (-20%)', p: atm * 0.8, v: 35, r: 5.5 },
                    { n: 'Crash (-40%)', p: atm * 0.6, v: 55, r: 6.5 },
                    { n: 'Melt Up (+50%)', p: atm * 1.5, v: 25, r: 4.0 },
                    { n: 'Vol Spike (flat)', p: atm, v: 45, r: 5.0 },
                  ].map((s) => {
                    const pl = payoffAt(legs, s.p)
                    const initial = legs.reduce((sum, leg) => sum + (leg.action === 'buy' ? 1 : -1) * leg.strike * 100 * leg.quantity, 0)
                    return (
                      <tr key={s.n}>
                        <td className="text-left text-primary">{s.n}</td>
                        <td className="text-right">${s.p.toFixed(0)}</td>
                        <td className="text-right">{s.v}%</td>
                        <td className="text-right">{s.r.toFixed(1)}%</td>
                        <td className={`text-right ${pl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{pl >= 0 ? '+' : ''}${pl.toFixed(0)}</td>
                        <td className={`text-right ${pl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{initial !== 0 ? `${(pl / Math.abs(initial) * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
