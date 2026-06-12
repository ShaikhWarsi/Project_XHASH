import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useApiQuery } from '../hooks/useApiQuery'

interface FxRate {
  pair: string
  bid: number
  ask: number
  change: number
  strength: number
  base: string
  quote: string
}

function StrengthMeter({ v }: { v: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
      <div style={{ flex: 1, height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: v > 70 ? 'var(--accent-green)' : v > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span className="text-[8px] font-mono-data text-muted w-8 text-right">{v}/100</span>
    </div>
  )
}

export default function CurrencyMatrixPage() {
  const { data, isLoading, error: queryError } = useApiQuery<any>('/market/fx-rates')
  const fx: FxRate[] = data?.rates ?? []
  const dxy = data?.dxy ?? 104.5
  const dxyChange = data?.dxy_change ?? 0

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="CURRENCY MATRIX" actions={
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono-data text-muted">DXY:</span>
          <span className="text-[11px] font-bold font-mono-data text-primary">{dxy.toFixed(2)}</span>
          <span className="text-[9px] font-mono-data" style={{ color: dxyChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {dxyChange >= 0 ? '+' : ''}{dxyChange.toFixed(2)}%
          </span>
          <Badge label="FX STRENGTH" variant="info" size="sm" />
        </div>
      }>
        {isLoading ? (
          <div className="text-[10px] font-mono-data text-muted py-4 text-center">Loading FX rates...</div>
        ) : queryError ? (
          <div className="text-[10px] font-mono-data text-down py-4 text-center">{String(queryError)}</div>
        ) : fx.length === 0 ? (
          <div className="text-[10px] font-mono-data text-muted">No FX data available.</div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
              <span>Pair</span><span>Bid</span><span>Ask</span><span>Change</span><span>Strength</span>
            </div>
            {fx.map((f) => (
              <div key={f.pair} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary items-center">
                <span className="font-semibold text-accent-cyan">{f.pair}</span>
                <span>{f.bid.toFixed(f.pair.includes('JPY') ? 3 : 4)}</span>
                <span>{f.ask.toFixed(f.pair.includes('JPY') ? 3 : 4)}</span>
                <span style={{ color: f.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {f.change >= 0 ? '+' : ''}{(f.change * 100).toFixed(2)}%
                </span>
                <StrengthMeter v={f.strength} />
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  )
}
