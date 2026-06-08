import type { DebateRound } from '../../api/types'

interface Props {
  rounds: DebateRound[]
  title: string
}

const SPEAKER_COLORS: Record<string, string> = {
  'Bull Researcher': '#22c55e',
  'Bear Researcher': '#ef4444',
  'Research Manager': '#a855f7',
}

export default function DebateThread({ rounds, title }: Props) {
  if (rounds.length === 0) {
    return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No debate rounds yet.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{title}</div>
      {rounds.map((round, i) => {
        const color = SPEAKER_COLORS[round.speaker] || '#4a9eff'
        return (
          <div key={i} style={{
            border: '1px solid var(--border-color)', borderRadius: 8, padding: 12,
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color, fontSize: 12, fontWeight: 600 }}>{round.speaker}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                Round {round.round} · {new Date(round.at).toLocaleTimeString()}
              </span>
            </div>
            <div style={{
              fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)', maxHeight: 300, overflowY: 'auto',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {round.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
