import { useState } from 'react'
import Card from './ui/Card'
import Skeleton from './Skeleton'
import { earningsSummaryGet } from '../api/llm'

export default function EarningsSummary() {
  const [symbol, setSymbol] = useState('')
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSummarize = async () => {
    if (!symbol.trim() || !transcript.trim()) return
    setLoading(true)
    setError(null)
    setSummary('')

    try {
      const res = await earningsSummaryGet(symbol.toUpperCase(), transcript)
      setSummary(res.summary)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <Card title="Earnings Call Summary" className="font-mono-data">
      <div className="space-y-2">
        <div>
          <label className="text-[9px] text-muted block mb-0.5">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. AAPL"
            className="w-full bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none uppercase"
          />
        </div>
        <div>
          <label className="text-[9px] text-muted block mb-0.5">Transcript Text</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste earnings call transcript here..."
            rows={6}
            className="w-full bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none resize-vertical"
          />
        </div>
        <button
          onClick={handleSummarize}
          disabled={loading || !symbol.trim() || !transcript.trim()}
          className="text-white border-none font-mono-data text-[10px] font-semibold px-3 py-1 rounded-sm w-full"
          style={{
            background: 'var(--accent-blue)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Summarizing...' : 'Summarize Earnings Call'}
        </button>

        {error && <div className="text-down text-[10px]">{error}</div>}

        {loading && (
          <div className="space-y-1.5">
            <Skeleton width="100%" height={10} />
            <Skeleton width="100%" height={10} />
            <Skeleton width="80%" height={10} />
            <Skeleton width="100%" height={10} />
            <Skeleton width="60%" height={10} />
          </div>
        )}

        {summary && !loading && (
          <div className="mt-1">
            <div className="text-[9px] text-muted mb-1 font-semibold tracking-wider uppercase">
              Bull / Bear / Risk
            </div>
            <div className="font-mono-data text-[10px] text-primary whitespace-pre-wrap leading-relaxed bg-hover p-2 rounded-sm border border-default">
              {summary}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
