import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { connectDashboardSSE } from '../api/client'
import type { DashboardSnapshot } from '../api/types'

const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

export default function AttributionAnalysis() {
  const [attribution, setAttribution] = useState<Record<string, unknown> | null>(null)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)

  useEffect(() => {
    const es = connectDashboardSSE(setSnapshot)
    return () => es.close()
  }, [])

  useEffect(() => {
    if (snapshot?.attribution && Object.keys(snapshot.attribution).length > 0) {
      setAttribution(snapshot.attribution)
    }
  }, [snapshot])

  const entries = attribution ? Object.entries(attribution) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Badge label="ATTRIBUTION" variant="info" />
        <span style={{ ...FONT_SM, color: 'var(--text-muted)' }}>
          Portfolio return decomposition
        </span>
        {snapshot && (
          <span style={{ ...FONT_SM, color: 'var(--text-muted)' }}>
            {new Date(snapshot.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {entries.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
          {entries.map(([key, value]) => {
            const isNum = typeof value === 'number'
            const positive = isNum && (value as number) > 0
            const negative = isNum && (value as number) < 0
            const absVal = isNum ? Math.abs(value as number) : 0
            const barWidth = isNum ? Math.min(absVal * 500, 100) : 0

            return (
              <div
                key={key}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 10px',
                }}
              >
                <div style={{ ...FONT_LABEL, color: 'var(--text-muted)', marginBottom: 2 }}>
                  {key.replace(/_/g, ' ')}
                </div>
                <div
                  style={{
                    ...FONT_DATA,
                    fontWeight: 700,
                    fontSize: 14,
                    color: positive ? 'var(--accent-green)' : negative ? 'var(--accent-red)' : 'var(--text-primary)',
                  }}
                >
                  {isNum
                    ? `${positive ? '+' : ''}${(value as number * 100).toFixed(2)}%`
                    : String(value).slice(0, 30)}
                </div>
                {isNum && (
                  <div style={{ marginTop: 4, background: 'var(--border-color)', height: 3, borderRadius: 2 }}>
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: positive ? 'var(--accent-green)' : 'var(--accent-red)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <Card title="No Attribution Data">
          <div style={{ padding: 24, textAlign: 'center', ...FONT_SM, color: 'var(--text-muted)' }}>
            Attribution data will appear here when the portfolio engine provides it via SSE
          </div>
        </Card>
      )}

      {entries.length > 0 && (
        <Card title="SUMMARY" padding="compact">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            <div>
              <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>ATTRIBUTION FACTORS</div>
              <div style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)' }}>{entries.length}</div>
            </div>
            <div>
              <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>POSITIVE</div>
              <div style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--accent-green)' }}>
                {entries.filter(([, v]) => typeof v === 'number' && (v as number) > 0).length}
              </div>
            </div>
            <div>
              <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>NEGATIVE</div>
              <div style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--accent-red)' }}>
                {entries.filter(([, v]) => typeof v === 'number' && (v as number) < 0).length}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
