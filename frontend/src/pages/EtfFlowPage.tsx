import Card from '../components/ui/Card'
export default function EtfFlowPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="ETF FLOW">
        <div className="text-[10px] font-mono-data text-muted">ETF creation/redemption flow data. Monitor underlying impact from authorized participant activity.</div>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.5fr] gap-1 py-1 mt-2 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>ETF</span><span>Flow ()</span><span>Created</span><span>Redeemed</span><span>? AUM</span>
        </div>
        <div className="py-6 text-center text-[10px] font-mono-data text-muted">Connect ETF data provider for live flow numbers.</div>
      </Card>
    </div>
  )
}
