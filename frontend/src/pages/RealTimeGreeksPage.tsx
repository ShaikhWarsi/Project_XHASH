import { useState } from 'react'
import Card from '../components/ui/Card'
export default function RealTimeGreeksPage() {
  const [symbol, setSymbol] = useState('SPY')
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="REAL-TIME GREEKS">
        <div className="flex items-center gap-2 mb-2">
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="bg-input border-input text-primary text-[10px] font-mono-data px-2 py-0.5 outline-none rounded-sm w-20" />
        </div>
        <div className="grid grid-cols-5 gap-2 mb-2">
          {[{ g: 'Delta', v: '0.52' }, { g: 'Gamma', v: '0.08' }, { g: 'Theta', v: '-0.03' }, { g: 'Vega', v: '0.15' }, { g: 'Rho', v: '0.01' }].map(d => (
            <div key={d.g} className="bg-card border border-default p-1.5 rounded-sm text-center">
              <div className="text-[9px] font-mono-data text-muted">{d.g}</div>
              <div className="text-[13px] font-mono-data font-bold text-primary">{d.v}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Strike</span><span>IV</span><span>Delta</span><span>Gamma</span><span>Theta</span><span>Vega</span><span>OI</span>
        </div>
        {[480, 485, 490, 495, 500, 505, 510].map(s => (
          <div key={s} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span className="font-semibold text-accent-cyan"></span>
            <span>19.2%</span>
            <span>{(0.5 - (s - 500) * 0.01).toFixed(2)}</span>
            <span>0.08</span>
            <span>-0.03</span>
            <span>0.15</span>
            <span className="text-muted">{Math.floor(Math.random() * 50000 + 1000)}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
