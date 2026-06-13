import { useEffect, useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Skeleton from './Skeleton'
import { fetchChinaStocks, fetchChinaIndices } from '../api/china'
import type { ChinaMarketData } from '../api/china'
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

interface StockConnectFlow {
  totalBuy: number
  totalSell: number
  netFlow: number
  topStocks: { symbol: string; name: string; flow: number }[]
}

const MOCK_NORTH_FLOW: StockConnectFlow = {
  totalBuy: 45.2e9,
  totalSell: 38.7e9,
  netFlow: 6.5e9,
  topStocks: [
    { symbol: '600519.SH', name: 'Kweichow Moutai', flow: 1.2e9 },
    { symbol: '300750.SZ', name: 'CATL', flow: 0.9e9 },
    { symbol: '601318.SH', name: 'Ping An', flow: 0.7e9 },
    { symbol: '000858.SZ', name: 'Wuliangye', flow: 0.5e9 },
    { symbol: '002415.SZ', name: 'Hikvision', flow: 0.4e9 },
  ],
}

const MOCK_SOUTH_FLOW: StockConnectFlow = {
  totalBuy: 32.1e9,
  totalSell: 29.8e9,
  netFlow: 2.3e9,
  topStocks: [
    { symbol: '0700.HK', name: 'Tencent', flow: 1.5e9 },
    { symbol: '9988.HK', name: 'Alibaba', flow: 1.1e9 },
    { symbol: '3690.HK', name: 'Meituan', flow: 0.8e9 },
    { symbol: '1810.HK', name: 'Xiaomi', flow: 0.4e9 },
    { symbol: '9618.HK', name: 'JD.com', flow: 0.3e9 },
  ],
}

function formatCNY(value: number): string {
  if (value >= 1e9) return `¥${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `¥${(value / 1e6).toFixed(2)}M`
  return `¥${value.toFixed(2)}`
}

export default function ChinaMarketsPanel() {
  const [stocks, setStocks] = useState<ChinaMarketData[]>([])
  const [indices, setIndices] = useState<ChinaMarketData[]>([])
  const [loading, setLoading] = useState(true)
  const [ashareTicker, setAshareTicker] = useState('600519.SH')
  const [connectDirection, setConnectDirection] = useState<'north' | 'south'>('north')
  const [tPlus1Date] = useState(() => new Date(Date.now() + 86400000).toLocaleDateString())

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchChinaStocks().then((r) => setStocks(r.stocks)).catch(() => { /* china data unavailable */ }),
      fetchChinaIndices().then((r) => setIndices(r.indices)).catch(() => { /* china data unavailable */ }),
    ]).finally(() => setLoading(false))
  }, [])

  const mockPrice = 152.30
  const mockPrevClose = 148.50
  const limitUp = mockPrevClose * 1.10
  const limitDown = mockPrevClose * 0.90
  const lotCost = mockPrice * 100

  const flowData = connectDirection === 'north' ? MOCK_NORTH_FLOW : MOCK_SOUTH_FLOW

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

      <div className="bg-card border border-default rounded p-2.5">
        <div className="font-mono-data text-[10px] font-bold text-up mb-2">A-SHARE DETAILS</div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-app border border-default rounded p-2">
            <div className="font-mono-data text-[9px] text-muted">Lot Size</div>
            <div className="font-mono-data text-[11px] font-bold text-primary">100 shares</div>
          </div>
          <div className="bg-app border border-default rounded p-2">
            <div className="font-mono-data text-[9px] text-muted">Price Limits</div>
            <div className="font-mono-data text-[11px] font-bold text-primary">±10%</div>
          </div>
          <div className="bg-app border border-default rounded p-2">
            <div className="font-mono-data text-[9px] text-muted">Settlement</div>
            <div className="font-mono-data text-[11px] font-bold text-primary">T+1</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono-data text-[9px] text-muted">Ticker:</span>
          <input value={ashareTicker} onChange={(e) => setAshareTicker(e.target.value.toUpperCase())}
            className="bg-app border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-[120px]" />
          <span className="font-mono-data text-[9px] text-muted">Price: ¥{mockPrice.toFixed(2)}</span>
          <span className="font-mono-data text-[9px] text-muted">Lot: ¥{lotCost.toFixed(0)}</span>
          <span className="font-mono-data text-[9px] text-muted">Limit: ¥{limitDown.toFixed(2)} – ¥{limitUp.toFixed(2)}</span>
          <span className="font-mono-data text-[9px] text-muted">Settle: {tPlus1Date}</span>
        </div>
      </div>

      <div className="bg-card border border-default rounded p-2.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono-data text-[10px] font-bold text-up">STOCK CONNECT FLOW</span>
          <button onClick={() => setConnectDirection('north')}
            className={`font-mono-data text-[9px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${connectDirection === 'north' ? 'bg-accent-cyan text-black' : 'bg-card text-primary'}`}>NORTH BOUND</button>
          <button onClick={() => setConnectDirection('south')}
            className={`font-mono-data text-[9px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${connectDirection === 'south' ? 'bg-accent-cyan text-black' : 'bg-card text-primary'}`}>SOUTH BOUND</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="bg-app border border-default rounded p-1.5 text-center">
            <div className="font-mono-data text-[9px] text-muted">Total Buy</div>
            <div className="font-mono-data text-[11px] font-bold text-up">{formatCNY(flowData.totalBuy)}</div>
          </div>
          <div className="bg-app border border-default rounded p-1.5 text-center">
            <div className="font-mono-data text-[9px] text-muted">Total Sell</div>
            <div className="font-mono-data text-[11px] font-bold text-down">{formatCNY(flowData.totalSell)}</div>
          </div>
          <div className="bg-app border border-default rounded p-1.5 text-center">
            <div className="font-mono-data text-[9px] text-muted">Net Flow</div>
            <div className="font-mono-data text-[11px] font-bold" style={{ color: flowData.netFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {flowData.netFlow >= 0 ? '+' : ''}{formatCNY(flowData.netFlow)}
            </div>
          </div>
        </div>
        <div className="font-mono-data text-[9px] font-semibold text-muted mb-1">TOP 5 STOCKS</div>
        {flowData.topStocks.map((s, i) => (
          <div key={s.symbol} className="flex items-center gap-2 py-0.5 border-b border-default font-mono-data text-[9px]">
            <span className="text-muted w-3">#{i + 1}</span>
            <span className="text-accent-cyan font-semibold">{s.symbol}</span>
            <span className="text-secondary flex-1">{s.name}</span>
            <span className="text-up font-semibold">{formatCNY(s.flow)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
