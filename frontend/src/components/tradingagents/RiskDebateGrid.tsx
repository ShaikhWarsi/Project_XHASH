import type { DebateRound } from '../../api/types'

interface Props {
  rounds: DebateRound[]
  title?: string
}

const COLORS: Record<string, { bg: string; border: string; label: string }> = {
  'Aggressive Analyst': { bg: '#ef444410', border: '#ef4444', label: 'Aggressive' },
  'Conservative Analyst': { bg: '#4a9eff10', border: '#4a9eff', label: 'Conservative' },
  'Neutral Analyst': { bg: '#a855f710', border: '#a855f7', label: 'Neutral' },
  'Portfolio Manager': { bg: '#22c55e10', border: '#22c55e', label: 'PM Decision' },
}

export default function RiskDebateGrid({ rounds, title }: Props) {
  if (rounds.length === 0) {
    return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No risk debate rounds yet.</div>
  }

  const grouped: Record<string, DebateRound[]> = {}
  for (const r of rounds) {
    if (!grouped[r.speaker]) grouped[r.speaker] = []
    grouped[r.speaker].push(r)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {title && <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {Object.entries(grouped).map(([speaker, speakerRounds]) => {
          const colors = COLORS[speaker] || { bg: 'transparent', border: '#666', label: speaker }
          return (
            <div key={speaker} style={{
              border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden',
              background: colors.bg,
            }}>
              <div style={{
                padding: '6px 10px', fontSize: 11, fontWeight: 600,
                background: colors.border, color: '#fff',
              }}>
                {colors.label}
              </div>
              <div style={{ padding: 10, maxHeight: 300, overflowY: 'auto', fontSize: 11, lineHeight: 1.5 }}>
                {speakerRounds.map((r, j) => (
                  <div key={j} style={{
                    padding: '6px 0', borderBottom: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  }}>
                    {r.content}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
