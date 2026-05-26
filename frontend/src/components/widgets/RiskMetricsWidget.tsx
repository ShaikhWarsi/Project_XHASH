import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import BaseWidget from './BaseWidget'
import { usePortfolioStore } from '../../store/portfolio'

function MetricRow({ label, value, color }: { label: string; value: string | null; color?: string }) {
  return (
    <div className="flex justify-between items-center px-2 py-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
      <span className="font-mono-data text-[9px] tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-mono-data text-[11px] font-bold" style={{ color: color || 'var(--text-primary)' }}>
        {value ?? <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>}
      </span>
    </div>
  )
}

export default function RiskMetricsWidget({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const { metrics, load } = usePortfolioStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const sharpe = metrics?.sharpe_ratio
  const sharpeColor = sharpe == null ? undefined : sharpe >= 1 ? 'var(--accent-green)' : sharpe >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'

  const maxDd = metrics?.max_drawdown
  const ddColor = maxDd == null ? undefined : Math.abs(maxDd) > 20 ? 'var(--accent-red)' : 'var(--text-primary)'

  const riskScore = sharpe != null ? Math.round(Math.min(Math.max((1 - sharpe) * 50 + 30, 0), 100)) : null
  const riskColor = riskScore == null ? undefined : riskScore < 30 ? 'var(--accent-green)' : riskScore < 60 ? 'var(--accent-yellow)' : 'var(--accent-red)'

  return (
    <BaseWidget id={id} title="RISK METRICS" onRemove={onRemove} isLoading={loading} headerColor="var(--accent-red)">
      {!metrics ? (
        <div className="p-6 text-center">
          <ShieldAlert size={32} className="mx-auto mb-3" style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
          <div className="font-mono-data text-[11px]" style={{ color: 'var(--text-muted)' }}>No portfolio data</div>
          <div className="font-mono-data text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Add holdings to see risk metrics
          </div>
        </div>
      ) : (
        <div>
          {riskScore != null && (
            <div className="flex justify-between items-center mx-1 my-1 p-2 rounded-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div className="font-mono-data text-[9px] tracking-wider" style={{ color: 'var(--text-muted)' }}>RISK SCORE</div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                  <div className="h-full rounded-full" style={{ width: `${riskScore}%`, backgroundColor: riskColor }} />
                </div>
                <span className="font-mono-data text-sm font-bold" style={{ color: riskColor }}>{riskScore}/100</span>
              </div>
            </div>
          )}

          <MetricRow label="SHARPE RATIO" value={sharpe?.toFixed(2) ?? null} color={sharpeColor} />
          <MetricRow label="MAX DRAWDOWN" value={maxDd != null ? `${(Math.abs(maxDd) * 100).toFixed(1)}%` : null} color={ddColor} />
          <MetricRow label="SORTINO" value={metrics?.sortino_ratio?.toFixed(2) ?? null} />
          <MetricRow label="VOLATILITY (Ann.)" value={metrics?.annualized_vol != null ? `${(metrics.annualized_vol * 100).toFixed(1)}%` : null} />
          <MetricRow label="VAR 95%" value={metrics?.var_95 != null ? `${(metrics.var_95 * 100).toFixed(1)}%` : null} color="var(--accent-red)" />
          <MetricRow label="CVAR 95%" value={metrics?.cvar_95 != null ? `${(metrics.cvar_95 * 100).toFixed(1)}%` : null} color="var(--accent-red)" />
          <MetricRow label="WIN RATE" value={metrics?.win_rate != null ? `${(metrics.win_rate * 100).toFixed(0)}%` : null} />
          <MetricRow label="PROFIT FACTOR" value={metrics?.profit_factor?.toFixed(2) ?? null} />
        </div>
      )}
    </BaseWidget>
  )
}
