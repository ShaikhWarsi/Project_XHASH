import Card from '../components/ui/Card'
export default function LiquidationMapPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="LIQUIDATION MAP">
        <div className="text-[10px] font-mono-data text-muted mb-2">Estimated liquidation clusters from open interest and leverage distribution</div>
        <div className="relative h-[300px] bg-card border border-default rounded-sm flex items-center justify-center text-[10px] font-mono-data text-muted">[Heatmap - Liquidation levels by price x OI]</div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[{ l: 'BTC', liq: '$62,400', oi: '28.5B' }, { l: 'ETH', liq: '$3,100', oi: '12.2B' }, { l: 'SOL', liq: '$142', oi: '3.1B' }].map(d => (
            <div key={d.l} className="bg-card border border-default p-1.5 rounded-sm">
              <div className="text-[9px] font-mono-data text-muted">{d.l}</div>
              <div className="text-[11px] font-mono-data font-bold text-down">${d.liq}</div>
              <div className="text-[8px] font-mono-data text-muted">OI: {d.oi}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
