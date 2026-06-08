import type { PortfolioDecision } from '../../api/types'

interface Props {
  decision: PortfolioDecision
}

const RATING_COLORS: Record<string, string> = {
  Buy: '#22c55e',
  Overweight: '#4ade80',
  Hold: '#facc15',
  Underweight: '#fb923c',
  Sell: '#ef4444',
}

export default function FinalDecisionCard({ decision }: Props) {
  const ratingColor = RATING_COLORS[decision.rating] || '#666'

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          display: 'inline-block', padding: '6px 20px', borderRadius: 20,
          background: ratingColor, color: '#000', fontWeight: 700, fontSize: 18,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {decision.rating}
        </span>
        {decision.price_target && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Target: ${decision.price_target.toFixed(2)}
          </span>
        )}
        {decision.time_horizon && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Horizon: {decision.time_horizon}
          </span>
        )}
      </div>

      {decision.executive_summary && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            EXECUTIVE SUMMARY
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {decision.executive_summary}
          </div>
        </div>
      )}

      {decision.investment_thesis && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            INVESTMENT THESIS
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {decision.investment_thesis}
          </div>
        </div>
      )}

      {decision.raw && (
        <details style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12 }}>
          <summary style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}>
            RAW DECISION TEXT
          </summary>
          <pre style={{
            marginTop: 8, fontSize: 10, lineHeight: 1.5, whiteSpace: 'pre-wrap',
            fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)',
            maxHeight: 400, overflowY: 'auto',
          }}>
            {decision.raw}
          </pre>
        </details>
      )}
    </div>
  )
}
