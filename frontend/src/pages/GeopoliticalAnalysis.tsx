import { useState } from 'react'
import { api } from '../api/client'

export default function GeopoliticalAnalysis() {
  const [symbol, setSymbol] = useState('SPY')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await api.post('/geo/analyze', { symbol, lookback_days: 7, region: 'global' })
      setResult(r.data)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 py-1 px-3 border-b border-default">
        <span className="font-bold text-[13px]">GEOPOLITICAL ANALYSIS</span>
        <span className="text-muted">|</span>
        <span className="text-[9px] text-muted">Real-time risk detection</span>
      </div>

      <div className="p-3 flex gap-2 items-center border-b border-default">
        <span className="text-[9px] text-muted">SYMBOL:</span>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-card border border-default text-primary px-2 py-1 text-[11px] font-mono-data w-[100px]" />
        <button onClick={analyze} disabled={loading}
          className="bg-[#3b82f6] border-0 text-white cursor-pointer py-1 px-3.5 text-[10px]" style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? 'ANALYZING...' : 'ANALYZE'}
        </button>
      </div>

      {error && <div className="p-3 text-down text-[10px]">{error}</div>}

      {result && (
        <div className="flex-1 overflow-auto p-3">
          <div className="flex gap-3 mb-4">
            <div className="bg-card border border-default px-3.5 py-2.5 rounded min-w-[120px]">
              <div className="text-[9px] text-muted mb-0.5">SENTIMENT SCORE</div>
              <div className="text-[22px] font-bold" style={{ color: result.sentiment_score > 0 ? '#22c55e' : '#ef4444' }}>{result.sentiment_score?.toFixed(0)}</div>
            </div>
            <div className="bg-card border border-default px-3.5 py-2.5 rounded min-w-[120px]">
              <div className="text-[9px] text-muted mb-0.5">GEO EVENTS</div>
              <div className="text-[22px] font-bold" style={{ color: result.geo_count > 0 ? '#f59e0b' : '#22c55e' }}>{result.geo_count}</div>
            </div>
            <div className="bg-card border border-default px-3.5 py-2.5 rounded min-w-[120px]">
              <div className="text-[9px] text-muted mb-0.5">GEO PENALTY</div>
              <div className="text-[22px] font-bold" style={{ color: result.geo_penalty < 0 ? '#ef4444' : '#22c55e' }}>{result.geo_penalty}</div>
            </div>
          </div>

          {result.alerts?.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-muted mb-1">ALERTS</div>
              {result.alerts.map((a: string, i: number) => (
                <div key={i} className="bg-card border border-default px-2.5 py-1.5 rounded-sm mb-1 text-[10px]">{a}</div>
              ))}
            </div>
          )}

          {result.trend_outlook && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-muted mb-1">TREND OUTLOOK</div>
              <div className="flex gap-2">
                {Object.entries(result.trend_outlook).map(([k, v]: [string, any]) => (
                  <div key={k} className="bg-card border border-default px-3 py-2 rounded flex-1">
                    <div className="text-[9px] text-muted mb-0.5">{k.toUpperCase()}</div>
                    <div className="text-sm font-bold" style={{ color: v.trend === 'BUY' ? '#22c55e' : v.trend === 'SELL' ? '#ef4444' : '#f59e0b' }}>{v.trend}</div>
                    <div className="text-[9px] text-muted">{v.strength} ({v.score?.toFixed(0)})</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.indicators && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-muted mb-1">INDICATORS</div>
              <div className="flex gap-2">
                {Object.entries(result.indicators).map(([k, v]: [string, any]) => (
                  <div key={k} className="bg-card border border-default px-2.5 py-1.5 rounded">
                    <div className="text-[9px] text-muted">{k}</div>
                    <div className="text-xs font-semibold">{typeof v === 'number' ? v.toFixed(2) : v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.geo_detections?.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted mb-1">DETECTED EVENTS ({result.geo_detections.length})</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-muted text-[9px] text-left border-b border-default">
                    <th className="px-2 py-1">Level</th>
                    <th className="px-2 py-1">Match</th>
                    <th className="px-2 py-1">Title</th>
                    <th className="px-2 py-1">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {result.geo_detections.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-[rgba(26,35,50,0.3)]">
                      <td className="px-2 py-[3px]">
                        <span className="font-semibold" style={{ color: d.level === 'severe' ? '#ef4444' : '#f59e0b' }}>{d.level.toUpperCase()}</span>
                      </td>
                      <td className="px-2 py-[3px] text-accent-blue">{d.matched}</td>
                      <td className="px-2 py-[3px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">{d.title}</td>
                      <td className="px-2 py-[3px] text-down">{d.penalty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="flex-1 flex items-center justify-center text-muted text-[10px]">
          Enter a symbol and click ANALYZE to detect geopolitical risks
        </div>
      )}
    </div>
  )
}
