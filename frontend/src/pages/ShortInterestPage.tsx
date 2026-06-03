import Card from '../components/ui/Card'
export default function ShortInterestPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="SHORT INTEREST (FINRA BI-WEEKLY)">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Symbol</span><span>Short Shares</span><span>Avg Volume</span><span>Days to Cover</span><span>% Float</span>
        </div>
        <div className="py-6 text-center text-[10px] font-mono-data text-muted">FINRA short interest data updated bi-weekly. Connect data feed.</div>
      </Card>
    </div>
  )
}
