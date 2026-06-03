import Card from '../components/ui/Card'
export default function DarkPoolPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="DARK POOL / BLOCK TRADES">
        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_0.5fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Time</span><span>Symbol</span><span>Size</span><span>Price</span><span>Volume</span><span>Exch</span>
        </div>
        <div className="py-6 text-center text-[10px] font-mono-data text-muted">No dark pool trades available. Connect an off-exchange data provider.</div>
      </Card>
    </div>
  )
}
