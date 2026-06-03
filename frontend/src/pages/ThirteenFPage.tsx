import Card from '../components/ui/Card'
export default function ThirteenFPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="13F HOLDINGS">
        <div className="text-[10px] font-mono-data text-muted mb-2">Institutional holdings tracking (SEC 13F filings). Search by fund manager or ticker.</div>
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.5fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Manager</span><span>Ticker</span><span>Shares</span><span>Value ()</span><span>% Portfolio</span><span>? QoQ</span>
        </div>
        <div className="py-6 text-center text-[10px] font-mono-data text-muted">No 13F data loaded. Connect SEC EDGAR feed.</div>
      </Card>
    </div>
  )
}
