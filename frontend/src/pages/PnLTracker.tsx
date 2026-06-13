import { useEffect, useState } from 'react'
import Card, { CardGrid } from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { useToastStore } from '../store/toast'
import { fetchPnLPositions, fetchPnLHistory, type PnLPosition, type PnLPoint } from '../api/openalgo'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'

const WIDTH = 600
const HEIGHT = 160

function MiniLineChart({ data }: { data: PnLPoint[] }) {
  if (!data.length) return null
  const values = data.map((d) => d.pnl)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = WIDTH / (data.length - 1 || 1)

  const points = data.map((d, i) => {
    const x = i * stepX
    const y = HEIGHT - 20 - ((d.pnl - min) / range) * (HEIGHT - 30)
    return `${x},${y}`
  })

  const fillPoints = `${points.join(' ')}, ${WIDTH},${HEIGHT - 10} 0,${HEIGHT - 10}`
  const color = values[values.length - 1] >= values[0] ? 'var(--accent-green)' : 'var(--accent-red)'

  return (
    <svg width={WIDTH} height={HEIGHT} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="pnlGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#pnlGrad)" />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={1.5} />
      <text x={0} y={9} fontSize={7} fill="var(--text-muted)" fontFamily="'JetBrains Mono', monospace">
        {min.toFixed(0)} — {max.toFixed(0)}
      </text>
    </svg>
  )
}

export default function PnLTracker() {
  const [positions, setPositions] = useState<PnLPosition[]>([])
  const [history, setHistory] = useState<PnLPoint[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    Promise.all([fetchPnLPositions(), fetchPnLHistory()])
      .then(([p, h]) => { setPositions(p); setHistory(h) })
      .catch((err) => addToast(`Failed to load P&L data: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [])

  const totalPnL = positions.reduce((s, p) => s + p.pnl, 0)
  const totalInvested = positions.reduce((s, p) => s + p.avg_entry * Math.abs(p.quantity), 0)

  const posColumns = [
    { key: 'symbol', label: 'Symbol', render: (p: PnLPosition) => <span className="font-bold text-[10px]">{p.symbol}</span>, sortable: true, sortValue: (p: PnLPosition) => p.symbol },
    { key: 'qty', label: 'Qty', render: (p: PnLPosition) => p.quantity, align: 'right' as const, sortable: true, sortValue: (p: PnLPosition) => p.quantity },
    { key: 'entry', label: 'Avg Entry', render: (p: PnLPosition) => p.avg_entry.toFixed(2), align: 'right' as const },
    { key: 'price', label: 'Current', render: (p: PnLPosition) => p.current_price.toFixed(2), align: 'right' as const },
    { key: 'pnl', label: 'P&L', render: (p: PnLPosition) => (
      <span style={{ color: p.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }} className="font-mono font-bold text-[10px]">
        {p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)}
      </span>
    ), align: 'right' as const, sortable: true, sortValue: (p: PnLPosition) => p.pnl },
    { key: 'pnlPct', label: '%', render: (p: PnLPosition) => (
      <Badge label={`${p.pnl_percent >= 0 ? '+' : ''}${p.pnl_percent.toFixed(2)}%`} variant={p.pnl_percent >= 0 ? 'success' : 'error'} />
    ), align: 'right' as const },
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-3 gap-1.5">
          {[1,2,3].map((i) => <Skeleton key={i} height={64} variant="rect" />)}
        </div>
        <Skeleton height={160} variant="rect" />
        <Skeleton height={200} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
        <BarChart3 size={12} className="inline mr-1" /> P&L Tracker
      </h2>

      <CardGrid cols={3}>
        <KpiCard label="Total P&L" value={`${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}`} icon={<DollarSign size={14} />} trend={totalPnL >= 0 ? 'up' : 'down'} />
        <KpiCard label="Positions" value={`${positions.length}`} icon={<BarChart3 size={14} />} />
        <KpiCard label="Total Invested" value={`${totalInvested.toFixed(0)}`} icon={<DollarSign size={14} />} />
      </CardGrid>

      <Card title="Equity Curve">
        {history.length > 0 ? <MiniLineChart data={history} /> : <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No history</div>}
      </Card>

      <Card title="Open Positions">
        {positions.length === 0 ? (
          <EmptyState title="No open positions" variant="no_data" />
        ) : (
          <DataTable columns={posColumns as any} data={positions as any} searchable={false} exportFilename="pnl-positions" />
        )}
      </Card>
    </div>
  )
}
