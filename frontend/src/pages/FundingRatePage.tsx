import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
export default function FundingRatePage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="FUNDING RATES (PERPS)">
        <div className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr_0.5fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Symbol</span><span>Rate</span><span>Period</span><span>Open Interest</span><span>Trend</span>
        </div>
        {[
          { s: 'BTC-PERP', r: '0.008%', p: '8h', oi: '28.5B', t: 'positive' },
          { s: 'ETH-PERP', r: '0.005%', p: '8h', oi: '12.2B', t: 'positive' },
          { s: 'SOL-PERP', r: '0.012%', p: '8h', oi: '3.1B', t: 'positive' },
          { s: 'DOGE-PERP', r: '-0.003%', p: '8h', oi: '0.9B', t: 'negative' },
        ].map(d => (
          <div key={d.s} className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr_0.5fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span className="font-semibold text-accent-cyan">{d.s}</span>
            <span style={{ color: d.r.startsWith('-') ? 'var(--accent-red)' : 'var(--accent-green)' }}>{d.r}</span>
            <span className="text-muted">{d.p}</span>
            <span className="text-muted">{d.oi}</span>
            <Badge label={d.t} variant={d.t === 'positive' ? 'success' : 'error'} size="sm" />
          </div>
        ))}
      </Card>
    </div>
  )
}
