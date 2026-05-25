import { useEffect, useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import { fetchAvailableProtections, checkProtections } from '../api/protections'
import type { ProtectionDef, ProtectionCheckResult, ProtectionConfig } from '../api/protections'
import { usePortfolioStore } from '../store/portfolio'
import { useToastStore } from '../store/toast'

const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

export default function ProtectionsPanel() {
  const { portfolio } = usePortfolioStore()
  const addToast = useToastStore((s) => s.addToast)
  const [available, setAvailable] = useState<ProtectionDef[]>([])
  const [results, setResults] = useState<ProtectionCheckResult[] | null>(null)
  const [allPassed, setAllPassed] = useState<boolean | null>(null)
  const [config, setConfig] = useState<ProtectionConfig>({
    max_drawdown_pct: 25,
    max_consecutive_losses: 5,
    max_daily_loss_pct: 5,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAvailableProtections()
      .then((r) => setAvailable(r.protections))
      .catch(() => {})
  }, [])

  const runCheck = async () => {
    setLoading(true)
    try {
      const equity = portfolio?.total_value ?? 100000
      const peak = Math.max(equity, 100000)
      const res = await checkProtections({
        ...config,
        initial_capital: 100000,
        current_equity: equity,
        peak_equity: peak,
      })
      setResults(res.results)
      setAllPassed(res.passed)
    } catch (err) {
      addToast('Protection check failed', 'error')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Card title="PROTECTION CONFIG" padding="compact">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>MAX DD %</div>
            <input
              type="number"
              value={config.max_drawdown_pct}
              onChange={(e) => setConfig({ ...config, max_drawdown_pct: Number(e.target.value) })}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                ...FONT_SM,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>MAX CONS LOSS</div>
            <input
              type="number"
              value={config.max_consecutive_losses}
              onChange={(e) => setConfig({ ...config, max_consecutive_losses: Number(e.target.value) })}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                ...FONT_SM,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>MAX DAILY LOSS %</div>
            <input
              type="number"
              value={config.max_daily_loss_pct}
              onChange={(e) => setConfig({ ...config, max_daily_loss_pct: Number(e.target.value) })}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                ...FONT_SM,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <button
            onClick={runCheck}
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--accent-blue)',
              color: '#fff',
              border: 'none',
              padding: '4px 0',
              ...FONT_SM,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'CHECKING...' : 'CHECK PROTECTIONS'}
          </button>
        </div>
      </Card>

      {allPassed !== null && (
        <Card title="PROTECTION STATUS">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Badge label={allPassed ? 'ALL PASSED' : 'BLOCKED'} variant={allPassed ? 'success' : 'error'} />
            <span style={{ ...FONT_SM, color: 'var(--text-secondary)' }}>
              {allPassed ? 'Trading allowed' : 'Some protections triggered'}
            </span>
          </div>
          {results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.map((r) => (
                <div
                  key={r.protection}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '3px 0',
                    borderBottom: '1px solid var(--border-color)',
                    ...FONT_DATA,
                  }}
                >
                  <span style={{ color: r.passed ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {r.passed ? '✓' : '✗'} {r.protection}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{r.reason}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {available.length > 0 && (
        <Card title="AVAILABLE PROTECTIONS" padding="compact">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {available.map((p) => (
              <div
                key={p.name}
                style={{
                  padding: '4px 8px',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  ...FONT_SM,
                  color: 'var(--text-secondary)',
                }}
                title={p.description}
              >
                {p.name}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
