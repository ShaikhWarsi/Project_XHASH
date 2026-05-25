import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import ProtectionsPanel from '../components/ProtectionsPanel'
import { fetchRiskMetrics } from '../api/client'
import type { RiskMetrics } from '../api/types'
import { useToastStore } from '../store/toast'

const HEATMAP_GREEN_RGB = { r: 34, g: 197, b: 94 }
const HEATMAP_RED_RGB = { r: 239, g: 68, b: 68 }
const HEATMAP_OPACITY_BASE = 0.15
const HEATMAP_OPACITY_VARY = 0.35

function HeatmapCell({ sector, exposure, return: ret, maxExposure }: { sector: string; exposure: number; return: number; maxExposure: number }) {
  const intensity = maxExposure > 0 ? exposure / maxExposure : 0
  const base = ret >= 0 ? HEATMAP_GREEN_RGB : HEATMAP_RED_RGB
  const r = Math.round(base.r * intensity)
  const g = Math.round(base.g * intensity)
  const b = Math.round(base.b * intensity)
  const bg = `rgba(${r}, ${g}, ${b}, ${HEATMAP_OPACITY_BASE + intensity * HEATMAP_OPACITY_VARY})`
  return (
    <div style={{ background: bg }} className="border border-default px-2 py-1">
      <div className="font-mono-data tracking-wider text-[9px] text-muted">{sector}</div>
      <div className="font-mono-data text-[11px] font-bold" style={{ color: ret >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
      </div>
      <div className="font-mono-data text-[10px] text-muted">${exposure.toLocaleString()}</div>
    </div>
  )
}

function ExposureBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? Math.abs(value) / maxValue * 100 : 0
  return (
    <div>
      <div className="flex justify-between font-mono-data text-[10px] mb-0.5">
        <span className="text-secondary">{label}</span>
        <span className="text-primary font-semibold">
          ${Math.abs(value).toLocaleString()} {value < 0 ? '(SHORT)' : ''}
        </span>
      </div>
      <div style={{ background: 'var(--border-color)', height: 6 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}

export default function RiskDashboard() {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'metrics' | 'protections'>('metrics')
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    fetchRiskMetrics()
      .then(setRiskMetrics)
      .catch((err) => addToast(`Failed to load risk metrics: ${err?.message || 'Error'}`, 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-4 gap-1.5">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="bg-card border border-default p-2">
              <Skeleton width={80} height={12} />
              <Skeleton width={60} height={20} style={{ marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const maxExposure = riskMetrics ? Math.max(...(riskMetrics.portfolioHeatmap?.map(h => h.exposure) || [1])) : 1

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1">
        <Badge label="RISK" variant="info" />
        {(['metrics', 'protections'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{
              background: tab === t ? 'rgba(59,130,246,0.15)' : 'none',
              border: 'none',
              color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}
          >
            {t === 'metrics' ? 'METRICS' : 'PROTECTIONS'}
          </button>
        ))}
      </div>

      {tab === 'protections' ? (
        <ProtectionsPanel />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            <Card title="EXPOSURE">
              <div className="grid grid-cols-2 gap-1">
                {riskMetrics && [
                  { label: 'TOTAL', value: `${riskMetrics.totalExposurePercent.toFixed(1)}%` },
                  { label: 'NET', value: `${riskMetrics.netExposure >= 0 ? 'LONG' : 'SHORT'} $${Math.abs(riskMetrics.netExposure).toLocaleString()}` },
                  { label: 'BUY POWER', value: `$${riskMetrics.buyingPower.toLocaleString()}` },
                  { label: 'MARGIN', value: `$${riskMetrics.marginUsed.toLocaleString()}` },
                ].map(m => (
                  <div key={m.label}>
                    <div className="font-mono-data tracking-wider text-[9px] text-muted">{m.label}</div>
                    <div className="font-mono-data text-[11px] font-semibold text-primary">{m.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="RISK">
              <div className="grid grid-cols-2 gap-1">
                {riskMetrics && [
                  { label: 'VaR 95%', value: `${(riskMetrics.var95 * 100).toFixed(1)}%` },
                  { label: 'CVaR 95%', value: `${(riskMetrics.cvar95 * 100).toFixed(1)}%` },
                  { label: 'SHARPE', value: riskMetrics.sharpeRatio.toFixed(2), pos: riskMetrics.sharpeRatio > 1, neg: riskMetrics.sharpeRatio < 0 },
                  { label: 'SORTINO', value: riskMetrics.sortinoRatio.toFixed(2), pos: riskMetrics.sortinoRatio > 1, neg: riskMetrics.sortinoRatio < 0 },
                ].map(m => (
                  <div key={m.label}>
                    <div className="font-mono-data tracking-wider text-[9px] text-muted">{m.label}</div>
                    <div className="font-mono-data text-[11px] font-semibold" style={{ color: m.pos ? 'var(--accent-green)' : m.neg ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="PORTFOLIO">
              <div className="grid grid-cols-2 gap-1">
                {riskMetrics && [
                  { label: 'MAX DD', value: `${(riskMetrics.maxDrawdown * 100).toFixed(1)}%` },
                  { label: 'BETA', value: riskMetrics.beta.toFixed(2) },
                  { label: 'LONG', value: `$${riskMetrics.longExposure.toLocaleString()}` },
                  { label: 'SHORT', value: `$${riskMetrics.shortExposure.toLocaleString()}` },
                ].map(m => (
                  <div key={m.label}>
                    <div className="font-mono-data tracking-wider text-[9px] text-muted">{m.label}</div>
                    <div className="font-mono-data text-[11px] font-semibold" style={{ color: m.label === 'MAX DD' ? 'var(--accent-red)' : m.label === 'LONG' ? 'var(--accent-green)' : m.label === 'SHORT' ? 'var(--accent-red)' : 'var(--text-primary)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="CONCENTRATION">
              <div className="grid grid-cols-2 gap-1">
                {riskMetrics && [
                  { label: 'GROSS', value: `$${riskMetrics.grossExposure.toLocaleString()}` },
                  { label: 'HEDGE', value: riskMetrics.shortExposure > 0 ? `${((riskMetrics.shortExposure / riskMetrics.grossExposure) * 100).toFixed(0)}%` : '—' },
                  { label: 'TOP SECTOR', value: riskMetrics.portfolioHeatmap?.sort((a, b) => b.exposure - a.exposure)[0]?.sector ?? '—' },
                  { label: 'SECTORS', value: `${riskMetrics.portfolioHeatmap?.length ?? 0}` },
                ].map(m => (
                  <div key={m.label}>
                    <div className="font-mono-data tracking-wider text-[9px] text-muted">{m.label}</div>
                    <div className="font-mono-data text-[11px] font-semibold text-primary">{m.value}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Card title="EXPOSURE ANALYSIS">
              {riskMetrics && (
                <div className="flex flex-col gap-1">
                  <ExposureBar label="LONG" value={riskMetrics.longExposure} maxValue={Math.max(riskMetrics.longExposure, riskMetrics.shortExposure, riskMetrics.grossExposure)} color="var(--accent-green)" />
                  <ExposureBar label="SHORT" value={riskMetrics.shortExposure} maxValue={Math.max(riskMetrics.longExposure, riskMetrics.shortExposure, riskMetrics.grossExposure)} color="var(--accent-red)" />
                  <ExposureBar label="GROSS" value={riskMetrics.grossExposure} maxValue={Math.max(riskMetrics.longExposure, riskMetrics.shortExposure, riskMetrics.grossExposure)} color="var(--accent-cyan)" />
                  <ExposureBar label="NET" value={riskMetrics.netExposure} maxValue={Math.max(riskMetrics.longExposure, riskMetrics.shortExposure, riskMetrics.grossExposure)} color={riskMetrics.netExposure >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
                </div>
              )}
            </Card>

            <Card title="SECTOR HEATMAP">
              {(riskMetrics?.portfolioHeatmap?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {riskMetrics?.portfolioHeatmap?.map((h) => (
                    <HeatmapCell key={h.sector} sector={h.sector} exposure={h.exposure} return={h.return} maxExposure={maxExposure} />
                  ))}
                </div>
              ) : (
                <div className="py-3 text-center font-mono-data text-[10px] text-muted">No position data</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
