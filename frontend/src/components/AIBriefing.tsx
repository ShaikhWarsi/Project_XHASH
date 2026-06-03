import { useState, useEffect } from 'react'
import Card from './ui/Card'
import Skeleton from './Skeleton'
import { briefingGet } from '../api/llm'

export default function AIBriefing({ onClose }: { onClose: () => void }) {
  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSummary, setDataSummary] = useState<any>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    briefingGet()
      .then((res) => {
        setBriefing(res.briefing)
        setDataSummary(res.data_summary)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-md p-4"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-data font-bold text-accent-cyan tracking-wider uppercase">
              AI Briefing
            </span>
            {dataSummary?.regime?.trend && (
              <span
                className="text-[8px] font-mono-data px-1.5 py-0.5 rounded-sm uppercase tracking-wider"
                style={{
                  background: dataSummary.regime.trend === 'bullish' ? 'rgba(34,197,94,0.2)' : dataSummary.regime.trend === 'bearish' ? 'rgba(239,68,68,0.2)' : 'rgba(100,116,139,0.2)',
                  color: dataSummary.regime.trend === 'bullish' ? 'var(--accent-green)' : dataSummary.regime.trend === 'bearish' ? 'var(--accent-red)' : 'var(--text-muted)',
                }}
              >
                {dataSummary.regime.trend}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={load}
              className="bg-transparent border border-default text-muted font-mono-data text-[9px] px-2 py-0.5 cursor-pointer rounded-sm"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="bg-transparent border border-default text-muted font-mono-data text-[9px] px-2 py-0.5 cursor-pointer rounded-sm"
            >
              Close
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton width="100%" height={12} />
            <Skeleton width="100%" height={12} />
            <Skeleton width="80%" height={12} />
            <Skeleton width="100%" height={12} />
            <Skeleton width="60%" height={12} />
          </div>
        )}

        {error && (
          <div className="text-down text-[10px] font-mono-data py-2">{error}</div>
        )}

        {!loading && !error && briefing && (
          <div className="font-mono-data text-[10px] text-primary whitespace-pre-wrap leading-relaxed">
            {briefing}
          </div>
        )}
      </div>
    </div>
  )
}
