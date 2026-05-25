import { useEffect, useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Skeleton from './Skeleton'
import { fetchChinaStocks, fetchChinaIndices } from '../api/china'
import type { ChinaMarketData } from '../api/china'

const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

export default function ChinaMarketsPanel() {
  const [stocks, setStocks] = useState<ChinaMarketData[]>([])
  const [indices, setIndices] = useState<ChinaMarketData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchChinaStocks().then((r) => setStocks(r.stocks)).catch(() => {}),
      fetchChinaIndices().then((r) => setIndices(r.indices)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Card title="CHINA MARKETS">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <Skeleton width={80} height={14} />
              <Skeleton width={60} height={14} />
              <Skeleton width={60} height={14} />
            </div>
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Card title={`CHINA STOCKS (${stocks.length})`}>
        {stocks.length === 0 ? (
          <div style={{ ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>No stock data available</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 60px 80px 80px', gap: 4, padding: '4px 0', borderBottom: '1px solid var(--border-color)', ...FONT_LABEL, color: 'var(--text-muted)' }}>
              <span>SYMBOL</span>
              <span>NAME</span>
              <span>EXCH</span>
              <span style={{ textAlign: 'right' }}>PRICE</span>
              <span style={{ textAlign: 'right' }}>CHG</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {stocks.map((s) => (
                <div
                  key={s.symbol}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 2fr 60px 80px 80px', gap: 4, padding: '3px 0',
                    borderBottom: '1px solid var(--border-color)', alignItems: 'center',
                  }}
                >
                  <span style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--accent-cyan)' }}>{s.symbol}</span>
                  <span style={{ ...FONT_SM, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <Badge label={s.exchange} variant={s.exchange === 'SH' ? 'error' : s.exchange === 'SZ' ? 'warning' : 'info'} size="sm" />
                  <span style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>${s.price.toFixed(2)}</span>
                  <span style={{ ...FONT_DATA, fontWeight: 600, color: s.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', textAlign: 'right' }}>
                    {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {indices.length > 0 && (
        <Card title={`CHINA INDICES (${indices.length})`}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {indices.map((idx) => (
              <div
                key={idx.symbol}
                style={{
                  flex: 1, minWidth: 160, background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px', border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...FONT_DATA, fontWeight: 700, color: 'var(--accent-cyan)' }}>{idx.symbol}</span>
                  <Badge label={idx.exchange} variant={idx.exchange === 'SH' ? 'error' : idx.exchange === 'SZ' ? 'warning' : 'info'} size="sm" />
                </div>
                <div style={{ ...FONT_SM, color: 'var(--text-secondary)', marginTop: 2 }}>{idx.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ ...FONT_DATA, fontWeight: 700, color: 'var(--text-primary)' }}>{idx.price.toFixed(2)}</span>
                  <span style={{ ...FONT_DATA, fontWeight: 700, color: idx.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
