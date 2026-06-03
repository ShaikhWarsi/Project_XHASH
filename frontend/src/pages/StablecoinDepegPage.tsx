import Card from '../components/ui/Card'
export default function StablecoinDepegPage() {
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="STABLECOIN DEPEG MONITOR">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Coin</span><span>Price</span><span>Deviation</span><span>Volume (24h)</span><span>Status</span>
        </div>
        {[
          { coin: 'USDT', price: '1.0002', dev: '+0.02%', vol: '42.5B', status: 'Pegged' },
          { coin: 'USDC', price: '0.9999', dev: '-0.01%', vol: '8.1B', status: 'Pegged' },
          { coin: 'DAI', price: '1.0005', dev: '+0.05%', vol: '1.2B', status: 'Pegged' },
          { coin: 'FDUSD', price: '1.0011', dev: '+0.11%', vol: '0.8B', status: 'Watch' },
          { coin: 'TUSD', price: '0.9985', dev: '-0.15%', vol: '0.3B', status: 'Watch' },
        ].map(d => (
          <div key={d.coin} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span className="font-semibold text-accent-cyan">{d.coin}</span>
            <span></span>
            <span style={{ color: Number(d.dev) > 0.05 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>{d.dev}</span>
            <span className="text-muted">{d.vol}</span>
            <span style={{ color: d.status === 'Pegged' ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{d.status}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
