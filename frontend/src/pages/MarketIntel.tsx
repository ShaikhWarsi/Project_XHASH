import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

type TabKey = 'equities' | 'flow' | 'crypto' | 'derivatives' | 'commodities'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'equities', label: 'Equities' },
  { key: 'flow', label: 'Flow' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'derivatives', label: 'Derivatives' },
  { key: 'commodities', label: 'Commodities' },
]

export default function MarketIntel() {
  const [tab, setTab] = useState<TabKey>('equities')
  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Market Intel</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Dark pool, ETF flow, crypto, options, commodities — all in one place</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '4px 12px', borderRadius: 3, fontSize: 9, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
            background: tab === t.key ? 'var(--accent-blue)' : 'transparent',
            border: `1px solid ${tab === t.key ? 'var(--accent-blue)' : 'var(--border-color, #1a2332)'}`,
            color: tab === t.key ? '#000' : 'var(--text-secondary)',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'equities' && <EquitiesTab />}
      {tab === 'flow' && <FlowTab />}
      {tab === 'crypto' && <CryptoTab />}
      {tab === 'derivatives' && <DerivativesTab />}
      {tab === 'commodities' && <CommoditiesTab />}
    </div>
  )
}

function EquitiesTab() {
  const [symbol, setSymbol] = useState('SPY')
  const [dpData, setDpData] = useState<any>(null)
  const [etfData, setEtfData] = useState<any>(null)
  const [insiderData, setInsiderData] = useState<any>(null)
  const [shortData, setShortData] = useState<any>(null)
  const [f13Data, setF13Data] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    setLoading(true); setError('')
    try {
      const [dp, etf, ins, sh, f13] = await Promise.all([
        fetch(`/api/alt-data/dark-pool?symbol=${symbol}`).then(r => r.json()).catch(() => null),
        fetch(`/api/alt-data/etf-flow?symbol=${symbol}`).then(r => r.json()).catch(() => null),
        fetch(`/api/alt-data/insider-transactions?symbol=${symbol}`).then(r => r.json()).catch(() => null),
        fetch(`/api/alt-data/short-interest?symbol=${symbol}`).then(r => r.json()).catch(() => null),
        fetch(`/api/alt-data/13f?symbol=${symbol}`).then(r => r.json()).catch(() => null),
      ])
      setDpData(dp); setEtfData(etf); setInsiderData(ins); setShortData(sh); setF13Data(f13)
    } catch (err: any) { setError(err.message || 'Failed to load equity data') } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [symbol])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
          style={{ padding: '4px 8px', fontSize: 9, width: 100, background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color, #1a2332)', color: 'var(--text-primary)', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace' }} placeholder="Symbol" />
        <button onClick={fetchAll} style={{ padding: '4px 10px', borderRadius: 3, fontSize: 9, cursor: 'pointer', background: 'var(--accent-cyan)', color: '#000', border: 'none' }}>
          {loading ? 'Loading...' : 'Refresh All'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--accent-red)', fontSize: 9, padding: '4px 0', fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Card title={`DARK POOL — ${symbol}`}>
          {dpData && <div className="text-[9px] text-muted mb-1">{dpData.note}</div>}
          {dpData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              <KpiBox label="Dark Pool %" value={`${dpData.averageDarkPoolPct}%`} color="var(--accent-cyan)" />
              <KpiBox label="Data Points" value={String(dpData.recentData?.length || 0)} />
              <KpiBox label="Source" value="yfinance (est.)" size="xs" />
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>No data</div>}
        </Card>

        <Card title={`ETF FLOW — ${symbol}`}>
          {etfData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              <KpiBox label="Avg Flow" value={`${(etfData.averageFlow || 0).toFixed(0)}`} color={etfData.averageFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <KpiBox label="Direction" value={etfData.averageFlow >= 0 ? 'Bullish' : 'Bearish'} />
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>No data</div>}
        </Card>

        <Card title="INSIDER TRANSACTIONS">
          {insiderData ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <Badge label={`Buys: ${insiderData.buys || 0}`} variant="success" size="sm" />
                <Badge label={`Sells: ${insiderData.sells || 0}`} variant="error" size="sm" />
              </div>
              {insiderData.transactions?.slice(0, 3).map((t: any, i: number) => (
                <div key={i} style={{ fontSize: 8, color: 'var(--text-secondary)', padding: '2px 0', borderBottom: '1px solid rgba(26,35,50,0.2)' }}>
                  {t.symbol || symbol} — {t.transactionType || t.type} — ${t.price || t.sharePrice || 0}
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>No data</div>}
        </Card>

        <Card title="SHORT INTEREST & 13F">
          {shortData && (
            <div style={{ marginBottom: 4 }}>
              <KpiBox label="Short % Float" value={`${shortData.shortPctFloat || 0}%`} />
            </div>
          )}
          {f13Data?.institutions?.slice(0, 3).map((inst: any, i: number) => (
            <div key={i} style={{ fontSize: 8, color: 'var(--text-secondary)', padding: '2px 0' }}>
              {inst.name || inst.institution} — {(inst.value || inst.shares || 0).toLocaleString()} shares
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function FlowTab() {
  const [symbol, setSymbol] = useState('SPY')
  const [orderData, setOrderData] = useState<any>(null)
  const [tapeData, setTapeData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/alt-data/order-flow?symbol=${symbol}`).then(r => r.json()).then(setOrderData).catch((e) => console.warn('[MarketIntel] order-flow failed:', e))
    fetch(`/api/alt-data/live-tape?symbol=${symbol}`).then(r => r.json()).then(setTapeData).catch((e) => console.warn('[MarketIntel] live-tape failed:', e))
  }, [symbol])

  const volProfile = orderData?.volumeProfile || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
          style={{ padding: '4px 8px', fontSize: 9, width: 100, background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color, #1a2332)', color: 'var(--text-primary)', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace' }} placeholder="Symbol" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Card title={`ORDER FLOW — ${symbol}`}>
          {orderData && (
            <div>
              <KpiBox label="Buy Volume" value={(orderData.totalBuyVolume || 0).toFixed(0)} color="var(--accent-green)" />
              <KpiBox label="Sell Volume" value={(orderData.totalSellVolume || 0).toFixed(0)} color="var(--accent-red)" />
              {volProfile.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Volume Profile</div>
                  {volProfile.slice(0, 8).map((v: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-secondary)', padding: '1px 0' }}>
                      <span>${v.price?.toFixed(2)}</span>
                      <span>{v.volume?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
        <Card title={`LIVE TAPE — ${symbol}`}>
          {tapeData?.tapes?.slice(0, 20).map((t: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: t.side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '1px 0' }}>
              <span>{t.time || t.timestamp}</span>
              <span>${t.price}</span>
              <span>{t.size?.toFixed(0)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function CryptoTab() {
  const [domData, setDomData] = useState<any>(null)
  const [fundingData, setFundingData] = useState<any>(null)
  const [stableData, setStableData] = useState<any>(null)
  const [liqData, setLiqData] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/alt-data/crypto-dominance').then(r => r.json()).catch(() => null),
      fetch('/api/alt-data/funding-rates').then(r => r.json()).catch(() => null),
      fetch('/api/alt-data/stablecoin-depeg').then(r => r.json()).catch(() => null),
      fetch('/api/alt-data/liquidation-map').then(r => r.json()).catch(() => null),
    ]).then(([d, f, s, l]) => { setDomData(d); setFundingData(f); setStableData(s); setLiqData(l) })
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Card title="CRYPTO DOMINANCE">
        {domData?.coins?.slice(0, 8).map((c: any, i: number) => (
          <div key={c.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(26,35,50,0.2)', fontSize: 9 }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.symbol}</span>
            <span style={{ color: 'var(--text-muted)' }}>${c.price?.toLocaleString()}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{c.dominanceEstimate?.toFixed(1)}%</span>
            <span style={{ color: c.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{c.change24h >= 0 ? '+' : ''}{c.change24h?.toFixed(2)}%</span>
          </div>
        ))}
      </Card>
      <Card title="FUNDING RATES">
        {fundingData?.rates?.slice(0, 8).map((r: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(26,35,50,0.2)', fontSize: 9 }}>
            <span style={{ color: 'var(--text-primary)' }}>{r.symbol}</span>
            <span style={{ color: r.rate >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{(r.rate * 100).toFixed(4)}%</span>
            <span style={{ color: 'var(--text-muted)' }}>{r.exchange}</span>
          </div>
        ))}
      </Card>
      <Card title="STABLECOIN DEEPEG">
        {stableData?.coins?.slice(0, 5).map((c: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(26,35,50,0.2)', fontSize: 9 }}>
            <span style={{ color: 'var(--text-primary)' }}>{c.name}</span>
            <span style={{ color: Math.abs(c.depegPct) > 0.5 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {c.depegPct >= 0 ? '+' : ''}{c.depegPct?.toFixed(3)}%
            </span>
          </div>
        ))}
      </Card>
      <Card title="LIQUIDATION MAP">
        {liqData?.levels?.slice(0, 8).map((l: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(26,35,50,0.2)', fontSize: 9 }}>
            <span style={{ color: 'var(--text-primary)' }}>${l.price?.toFixed(2)}</span>
            <span style={{ color: l.side === 'long' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {l.side?.toUpperCase()} — {(l.liquidationValue || l.value || 0).toFixed(0)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}

function DerivativesTab() {
  const [symbol, setSymbol] = useState('SPY')
  const [greeksData, setGreeksData] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/alt-data/greeks?symbol=${symbol}`).then(r => r.json()).then(setGreeksData).catch((e) => console.warn('[MarketIntel] greeks failed:', e))
  }, [symbol])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
          style={{ padding: '4px 8px', fontSize: 9, width: 100, background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color, #1a2332)', color: 'var(--text-primary)', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace' }} placeholder="Symbol" />
      </div>
      <Card title={`OPTIONS GREEKS — ${symbol}`}>
        {greeksData?.options?.length > 0 ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
              <KpiBox label="Avg Delta" value={greeksData.options.reduce((a: number, o: any) => a + (o.delta || 0), 0) / greeksData.options.length} />
              <KpiBox label="Avg Gamma" value={greeksData.options.reduce((a: number, o: any) => a + (o.gamma || 0), 0) / greeksData.options.length} />
              <KpiBox label="Avg Theta" value={greeksData.options.reduce((a: number, o: any) => a + (o.theta || 0), 0) / greeksData.options.length} />
              <KpiBox label="Avg Vega" value={greeksData.options.reduce((a: number, o: any) => a + (o.vega || 0), 0) / greeksData.options.length} />
              <KpiBox label="Avg IV" value={`${(greeksData.options.reduce((a: number, o: any) => a + (o.iv || 0), 0) / greeksData.options.length * 100).toFixed(1)}%`} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Strike', 'Type', 'Delta', 'Gamma', 'Theta', 'Vega', 'IV'].map(h => (
                  <th key={h} style={{ padding: '3px 6px', fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {greeksData.options.slice(0, 10).map((o: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(26,35,50,0.15)' }}>
                    <td style={{ padding: '3px 6px', fontSize: 8, color: 'var(--text-primary)' }}>${o.strike}</td>
                    <td style={{ padding: '3px 6px', fontSize: 8, color: o.type === 'call' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{o.type}</td>
                    <td style={{ padding: '3px 6px', fontSize: 8 }}>{o.delta?.toFixed(3)}</td>
                    <td style={{ padding: '3px 6px', fontSize: 8 }}>{o.gamma?.toFixed(5)}</td>
                    <td style={{ padding: '3px 6px', fontSize: 8 }}>{o.theta?.toFixed(4)}</td>
                    <td style={{ padding: '3px 6px', fontSize: 8 }}>{o.vega?.toFixed(4)}</td>
                    <td style={{ padding: '3px 6px', fontSize: 8 }}>{(o.iv * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>No options data for {symbol}</div>}
      </Card>
    </div>
  )
}

function CommoditiesTab() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/alt-data/commodities').then(r => r.json()).then(setData).catch((e) => console.warn('[MarketIntel] commodities failed:', e))
  }, [])

  const groups = data?.groups || []
  const allCommodities = groups.flatMap((g: any) => (g.items || []).map((item: any) => ({ ...item, group: g.group })))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Card title="COMMODITIES">
        {groups.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6 }}>
            {allCommodities.map((c: any, i: number) => (
              <div key={i} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 4, padding: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-primary)' }}>{c.symbol}</div>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: c.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  ${c.price?.toFixed(2)} <span style={{ fontSize: 8 }}>{c.change >= 0 ? '+' : ''}{c.change?.toFixed(2)}%</span>
                </div>
                <div style={{ fontSize: 7, color: 'var(--text-muted)' }}>{c.group || c.name}</div>
              </div>
            ))}
          </div>
        ) : <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>No commodity data</div>}
      </Card>
    </div>
  )
}

function KpiBox({ label, value, color, size }: { label: string; value: string | number; color?: string; size?: string }) {
  return (
    <div style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 4, padding: 6, textAlign: 'center' }}>
      <div style={{ fontSize: size === 'xs' ? 7 : 8, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: size === 'xs' ? 9 : 11, fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    </div>
  )
}
