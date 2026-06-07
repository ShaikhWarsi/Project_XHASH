import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Spinner from '../components/Spinner'
import { RefreshCw } from 'lucide-react'

interface BriefingData {
  regime: string
  portfolio_summary: string
  top_signal: string
  top_risk: string
  paragraphs: string[]
}

export default function AIBriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchBriefing = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/briefing')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData({
        regime: json.regime || 'Unknown',
        portfolio_summary: json.portfolio_summary || '',
        top_signal: json.top_signal || '',
        top_risk: json.top_risk || '',
        paragraphs: json.paragraphs || json.content ? [json.content] : [],
      })
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load briefing')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBriefing() }, [fetchBriefing])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Trading Briefing</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Daily AI-generated market briefing based on your positions, watchlist, and signals
          </p>
        </div>
        <button onClick={fetchBriefing} disabled={loading}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 12px', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !data && <Spinner label="Generating briefing..." />}

      {error && (
        <div className="rounded-lg px-4 py-2 text-sm" style={{ background: 'color-mix(in srgb, var(--accent-red) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-red) 20%, transparent)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Market Regime">
              <div className="text-lg font-bold" style={{ color: 'var(--accent-cyan)' }}>{data.regime}</div>
            </Card>
            <Card title="Top Signal">
              <div className="text-sm" style={{ color: 'var(--accent-green)' }}>{data.top_signal || 'No active signals'}</div>
            </Card>
            <Card title="Top Risk">
              <div className="text-sm" style={{ color: 'var(--accent-red)' }}>{data.top_risk || 'No risks identified'}</div>
            </Card>
          </div>

          <Card title="Portfolio Summary">
            <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {data.portfolio_summary || 'No portfolio data available.'}
            </div>
          </Card>

          {data.paragraphs.length > 0 && (
            <Card title="Analysis">
              <div className="space-y-3">
                {data.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p}</p>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
