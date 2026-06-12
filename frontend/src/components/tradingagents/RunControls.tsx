import { useState, useRef, useEffect } from 'react'
import { useTradingAgentsStore } from '../../store/tradingagents'
import { scrapeOnly, startAnalysis, listRuns, streamRun, getRun, getRunStatus } from '../../api/tradingagents'
import { useToastStore } from '../../store/toast'

export default function RunControls() {
  const {
    ticker, setTicker, status, setStatus,
    setScrapeBundle, setReport, setRunHistory, setActiveRunId,
    setError, reset, addEvent, activeRunId, currentStage,
    updateFromStatus, setSseConnected,
  } = useTradingAgentsStore()
  const addToast = useToastStore((s) => s.addToast)

  const [maxDebate, setMaxDebate] = useState(1)
  const [maxRisk, setMaxRisk] = useState(1)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  const handleScrape = async () => {
    if (!ticker.trim()) return
    setStatus('scraping')
    setError(null)
    try {
      const bundle = await scrapeOnly(ticker.trim().toUpperCase())
      setScrapeBundle(bundle)
      setStatus('idle')
      addToast(`Scraped ${bundle.sources?.length || 0} sources for ${ticker.toUpperCase()}`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scrape failed'
      setError(msg)
      addToast(msg, 'error')
      setStatus('idle')
    }
  }

  const handleAnalyze = async () => {
    if (!ticker.trim()) return
    setStatus('analyzing')
    setError(null)
    reset()

    // Clean up any previous poll
    if (pollRef.current) clearInterval(pollRef.current)
    if (cleanupRef.current) cleanupRef.current()

    try {
      const resp = await startAnalysis({
        ticker: ticker.trim().toUpperCase(),
        max_debate_rounds: maxDebate,
        max_risk_rounds: maxRisk,
      })
      if (!resp.run_id) {
        throw new Error('Backend did not return a run ID')
      }
      const { run_id } = resp
      setActiveRunId(run_id)

      // Connect SSE stream with reconnect handler
      cleanupRef.current = streamRun(run_id, (event) => {
        addEvent(event)

        // Auto-fetch report when complete
        if (event.event === 'run_complete' || event.event === 'pipeline_error' || event.event === 'pipeline_cancelled') {
          fetchReport(run_id)
        }
      }, (err) => {
        addToast(err.message, 'error')
        // Fall back to status polling
        startStatusPoll(run_id)
      }, () => {
        setSseConnected(true)
      })

      // Also poll for status periodically to update the progress UI
      pollRef.current = setInterval(async () => {
        try {
          const runStatus = await getRunStatus(run_id)
          if (runStatus) {
            updateFromStatus(runStatus)
          }
        } catch {
          // ignore
        }
      }, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
      addToast(msg, 'error')
      setStatus('idle')
    }
  }

  const fetchReport = async (runId: string) => {
    try {
      const report = await getRun(runId)
      if (report.final?.rating) {
        setReport(report)
        setStatus('done')
        setActiveRunId(null)
        listRuns(10).then(setRunHistory).catch(() => addToast('Failed to refresh run history', 'error'))
        addToast(`Analysis complete for ${ticker.toUpperCase()}: ${report.final.rating}`, 'success')
        if (pollRef.current) clearInterval(pollRef.current)
      }
    } catch {
      // still processing
    }
  }

  const startStatusPoll = (runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const report = await getRun(runId)
        if (report.final?.rating) {
          setReport(report)
          setStatus('done')
          setActiveRunId(null)
          listRuns(10).then(setRunHistory).catch(() => addToast('Failed to refresh run history', 'error'))
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // still pending
      }
    }, 3000)
  }

  const errMsg = useTradingAgentsStore((s) => s.error)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker (e.g. NVDA)"
          style={{
            flex: 1, padding: '8px 12px', fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 6, color: 'var(--text-primary)',
          }}
        />
        <button onClick={handleScrape} disabled={!ticker.trim() || status === 'analyzing' || status === 'scraping'}
          style={btnStyle('#4a9eff')}>
          {status === 'scraping' ? 'Scraping...' : 'Scrape'}
        </button>
        <button onClick={handleAnalyze} disabled={!ticker.trim() || status === 'analyzing'}
          style={btnStyle('#22c55e')}>
          {status === 'analyzing' ? 'Running...' : 'Analyze'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        <label>Max Debate Rounds:
          <input type="number" min={0} max={10} value={maxDebate}
            onChange={(e) => setMaxDebate(Math.max(0, Math.min(10, +e.target.value)))}
            style={numInputStyle} />
        </label>
        <label>Max Risk Rounds:
          <input type="number" min={0} max={10} value={maxRisk}
            onChange={(e) => setMaxRisk(Math.max(0, Math.min(10, +e.target.value)))}
            style={numInputStyle} />
        </label>
      </div>
      {errMsg && (
        <div style={{
          padding: '8px 12px', fontSize: 11, color: '#ef4444',
          background: '#2a1010', borderRadius: 6,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {errMsg}
        </div>
      )}
    </div>
  )
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: '8px 16px', fontSize: 12, fontWeight: 600,
    background: color, color: '#fff', border: 'none',
    borderRadius: 6, cursor: 'pointer', opacity: 0.9,
    fontFamily: "'JetBrains Mono', monospace",
  }
}

const numInputStyle: React.CSSProperties = {
  width: 48, marginLeft: 6, padding: '2px 6px', fontSize: 12,
  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
  borderRadius: 4, color: 'var(--text-primary)',
}
