import { useEffect, useState, useCallback } from 'react'
import { getDebugInfo, scrapeOnly, startAnalysis, getRun, listRuns } from '../api/tradingagents'
import { api } from '../api/client'
import { useToastStore } from '../store/toast'
import { Terminal, Activity, Database, Cpu, Check, X, Clock, RefreshCw, Play, Copy } from 'lucide-react'

interface HealthStatus {
  status: string
  uptime_seconds: number
  background_tasks_running: number
  dependencies: Record<string, any>
}

interface DebugInfo {
  backend_up: boolean
  database_up: boolean
  lm_studio_up: boolean
  lm_studio_model: string
  lm_studio_context: number
  last_runs: any[]
  uptime_seconds: number
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 4,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      background: ok ? '#0a1a0a' : '#1a0a0a',
      border: `1px solid ${ok ? '#22c55e44' : '#ef444444'}`,
      color: ok ? '#22c55e' : '#ef4444',
    }}>
      {ok ? <Check size={12} /> : <X size={12} />}
      {label}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 12px', fontSize: 10, fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)',
        background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)',
      }}>
        {title}
      </div>
      <div style={{ padding: 12 }}>
        {children}
      </div>
    </div>
  )
}

export default function Debug() {
  const addToast = useToastStore((s) => s.addToast)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testStatus, setTestStatus] = useState<string | null>(null)
  const [testTicker, setTestTicker] = useState('NVDA')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const h = await api.get('/health').then(r => r.data)
      setHealth(h)
    } catch (e) {
      setHealth(null)
    }
    try {
      const d = await getDebugInfo()
      setDebugInfo(d)
    } catch (e) {
      setDebugInfo(null)
    }
    try {
      const r = await listRuns(10)
      setRuns(r)
    } catch (e) {
      setRuns([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const runTestScrape = async () => {
    setTestStatus(`Scraping ${testTicker}...`)
    try {
      const bundle = await scrapeOnly(testTicker)
      setTestStatus(`Scrape OK: ${bundle.sources?.length || 0} sources, ${bundle.sources?.reduce((a: number, s: any) => a + (s.items?.length || 0), 0) || 0} items`)
      addToast(`Scrape test: ${testTicker} - ${bundle.sources?.length || 0} sources`, 'success')
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message
      setTestStatus(`Scrape FAILED: ${msg}`)
      addToast(`Scrape test failed: ${msg}`, 'error')
    }
  }

  const runTestAnalyze = async () => {
    setTestStatus(`Analyzing ${testTicker}... (up to 60s)`)
    try {
      const { run_id } = await startAnalysis({
        ticker: testTicker,
        max_debate_rounds: 0,
        max_risk_rounds: 0,
      })
      // Poll for completion
      let attempts = 0
      const poll = async (): Promise<void> => {
        try {
          const report = await getRun(run_id)
          if (report.final?.rating) {
            setTestStatus(`Analysis OK: ${report.final.rating} - ${report.final.executive_summary?.slice(0, 100) || ''}`)
            addToast(`Analysis test complete: ${testTicker} -> ${report.final.rating}`, 'success')
            return
          }
          } catch (pollErr) { console.error('[Debug] Poll error:', pollErr) }
        attempts++
        if (attempts < 30) {
          setTimeout(poll, 2000)
        } else {
          setTestStatus('Analysis TIMEOUT (60s) - check backend')
          addToast('Analysis test timed out', 'error')
        }
      }
      await new Promise(r => setTimeout(r, 3000))
      await poll()
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e.message
      setTestStatus(`Analysis FAILED: ${msg}`)
      addToast(`Analysis test failed: ${msg}`, 'error')
    }
  }

  if (loading) {
    return (
      <div style={{
        padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: 'var(--text-muted)',
      }}>
        Loading debug info...
      </div>
    )
  }

  return (
    <div style={{
      padding: 16, display: 'flex', flexDirection: 'column', gap: 16,
      height: '100%', overflow: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Terminal size={16} />
        <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          Debug Console
        </span>
        <button onClick={loadAll} style={{
          marginLeft: 'auto', padding: '4px 10px', fontSize: 9,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          background: 'var(--bg-hover)', color: 'var(--text-primary)',
          border: '1px solid var(--border-color)', borderRadius: 4,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <RefreshCw size={10} />
          Refresh
        </button>
      </div>

      {/* System Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
        <StatusBadge ok={health?.status === 'ok' || health?.status === 'degraded'} label={`Backend: ${health?.uptime_seconds ? `${Math.floor(health.uptime_seconds / 60)}m` : 'down'}`} />
        <StatusBadge ok={debugInfo?.database_up || false} label={`Database ${debugInfo?.database_up ? 'OK' : 'Down'}`} />
        <StatusBadge ok={debugInfo?.lm_studio_up || false} label={`LM Studio ${debugInfo?.lm_studio_up ? debugInfo.lm_studio_model : 'Unreachable'}`} />
        <StatusBadge ok={health?.background_tasks_running ? health.background_tasks_running > 0 : false} label={`${health?.background_tasks_running || 0} background tasks`} />
      </div>

      {/* Dependencies */}
      {health?.dependencies && (
        <Section title="DEPENDENCIES">
          <div style={{ display: 'grid', gap: 6 }}>
            {Object.entries(health.dependencies).map(([name, dep]: [string, any]) => (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 4,
              }}>
                <span style={{ fontWeight: 600, minWidth: 100, color: 'var(--text-primary)' }}>{name}</span>
                <span style={{
                  color: dep.status === 'ok' ? '#22c55e' : dep.status === 'deferred' ? '#facc15' : '#ef4444',
                }}>
                  {dep.status.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 9 }}>
                  {JSON.stringify(Object.fromEntries(Object.entries(dep).filter(([k]) => k !== 'status')))}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Last Runs */}
      <Section title={`LAST RUNS (${runs.length})`}>
        {runs.length === 0 ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)', padding: 8 }}>
            No runs yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {runs.map((run) => (
              <div key={run.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 4,
              }}>
                <span style={{ fontWeight: 600, minWidth: 60 }}>{run.ticker}</span>
                <span style={{
                  color: run.status === 'done' ? '#22c55e' : run.status === 'failed' ? '#ef4444' : run.status === 'cancelled' ? '#facc15' : '#4a9eff',
                }}>
                  {run.status.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>
                  {run.started_at ? new Date(run.started_at).toLocaleString() : ''}
                </span>
                {run.error && (
                  <span style={{ color: '#ef4444', marginLeft: 'auto', fontSize: 9, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {run.error.slice(0, 100)}
                  </span>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(run, null, 2))
                    addToast('Run details copied', 'success')
                  }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: 2, marginLeft: 'auto',
                  }}
                >
                  <Copy size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Test Controls */}
      <Section title="TEST CONTROLS">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={testTicker}
              onChange={(e) => setTestTicker(e.target.value.toUpperCase())}
              placeholder="Ticker"
              style={{
                width: 100, padding: '6px 10px', fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 4, color: 'var(--text-primary)',
              }}
            />
            <button onClick={runTestScrape} style={testBtnStyle('#4a9eff')} disabled={testStatus?.includes('...')}>
              <Play size={10} /> Test Scrape
            </button>
            <button onClick={runTestAnalyze} style={testBtnStyle('#22c55e')} disabled={testStatus?.includes('...')}>
              <Play size={10} /> Test Analyze
            </button>
          </div>
          {testStatus && (
            <div style={{
              padding: '8px 12px', borderRadius: 4,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              background: testStatus.includes('FAILED') || testStatus.includes('TIMEOUT') ? '#1a0a0a' : '#0a1a0a',
              border: `1px solid ${testStatus.includes('OK') ? '#22c55e44' : '#ef444444'}`,
              color: testStatus.includes('OK') ? '#22c55e' : '#ef4444',
            }}>
              {testStatus}
            </div>
          )}
        </div>
      </Section>

      {/* Keyboard shortcuts */}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Ctrl+R</span> Refresh · Click run row to copy JSON · Debug page hidden from nav, accessible at /debug
      </div>
    </div>
  )
}

function testBtnStyle(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 12px', fontSize: 10, fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    background: color + '22', color,
    border: `1px solid ${color}44`, borderRadius: 4,
    cursor: 'pointer', opacity: 0.9,
  }
}