import { useTradingAgentsStore } from '../../store/tradingagents'
import { Loader2 } from 'lucide-react'

const STAGE_LABELS: Record<string, string> = {
  pipeline_start: 'Starting pipeline',
  scrape_complete: 'Scraped data',
  node_start: 'Running node...',
  node_complete: 'Node complete',
  analyst_complete: 'Analyst report ready',
  debate_round: 'Debate round',
  research_manager_decision: 'Research manager decision',
  trader_decision: 'Trader decision',
  pm_decision: 'Portfolio manager decision',
  run_complete: 'Complete!',
  pipeline_error: 'Error',
}

export default function StreamProgress() {
  const { events, status } = useTradingAgentsStore()

  if (status === 'idle' || status === 'scraping') return null

  return (
    <div style={{
      padding: '8px 16px', borderBottom: '1px solid var(--border-color)',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
      fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)',
    }}>
      {status === 'analyzing' && <Loader2 size={12} className="animate-spin" />}
      <span>
        {events.length > 0
          ? STAGE_LABELS[events[events.length - 1]?.event] || events[events.length - 1]?.event
          : 'Waiting for pipeline...'}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
        ({events.length} events)
      </span>
    </div>
  )
}
