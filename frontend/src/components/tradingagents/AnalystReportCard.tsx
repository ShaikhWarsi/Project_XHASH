import type { AnalystReport } from '../../api/types'

interface Props {
  report: AnalystReport
}

const AVATARS: Record<string, string> = {
  'Market Analyst': '📈',
  'Sentiment Analyst': '💭',
  'News Analyst': '📰',
  'Fundamentals Analyst': '📊',
}

export default function AnalystReportCard({ report }: Props) {
  const avatar = Object.entries(AVATARS).find(([k]) =>
    report.name.toLowerCase().includes(k.toLowerCase().split(' ')[0].toLowerCase())
  )?.[1] || '🤖'

  return (
    <div style={{
      border: '1px solid var(--border-color)', borderRadius: 8,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{avatar}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{report.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {new Date(report.at).toLocaleTimeString()}
          </div>
        </div>
      </div>
      <div style={{
        fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
        color: 'var(--text-primary)', maxHeight: 300, overflowY: 'auto',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {report.content}
      </div>
    </div>
  )
}
