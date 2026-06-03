import Card from '../components/ui/Card'
export default function InsiderTransactionsPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="INSIDER TRANSACTIONS (FORM 4)">
        <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_0.5fr_0.5fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Filing Date</span><span>Symbol</span><span>Insider</span><span>Shares</span><span>Type</span><span>Price</span>
        </div>
        <div className="py-6 text-center text-[10px] font-mono-data text-muted">No insider transactions loaded. Connect SEC EDGAR data feed.</div>
      </Card>
    </div>
  )
}
