import Card from '../components/ui/Card'
export default function FootprintChartPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="FOOTPRINT / CLUSTER CHART">
        <div className="text-[10px] font-mono-data text-muted mb-2">Bid/Ask volume per price level inside each candle - delta, volume profile, imbalance</div>
        <div className="relative h-[400px] bg-card border border-default rounded-sm flex items-center justify-center text-[10px] font-mono-data text-muted">[Canvas - Footprint chart with bid/ask volume clusters]</div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[{ l: 'Bid Volume', v: '142.3K' }, { l: 'Ask Volume', v: '138.7K' }, { l: 'Delta', v: '+3.6K' }, { l: 'Imbalance', v: '1.03' }].map(d => (
            <div key={d.l} className="bg-card border border-default p-1.5 rounded-sm">
              <div className="text-[9px] font-mono-data text-muted">{d.l}</div>
              <div className="text-[11px] font-mono-data font-bold text-primary">{d.v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
