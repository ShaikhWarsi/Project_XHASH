import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'

interface AlphaMeta {
  id: string
  zoo: string
  meta: {
    theme: string[]
    universe: string[]
    formula_latex: string
    decay_horizon: number
    min_warmup_bars: number
  }
}

type Tab = 'browse' | 'bench'

const ZOOS = ['alpha101', 'academic', 'gtja191', 'qlib158']
const THEMES = ['momentum', 'reversal', 'volume', 'volatility', 'quality', 'value', 'liquidity', 'sentiment']
const UNIVERSES = ['equity_us', 'equity_cn', 'equity_hk', 'crypto', 'futures']

export default function FactorZoo() {
  const [tab, setTab] = useState<Tab>('browse')
  const [alphas, setAlphas] = useState<AlphaMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [zooFilter, setZooFilter] = useState('')
  const [themeFilter, setThemeFilter] = useState('')
  const [univFilter, setUnivFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAlpha, setSelectedAlpha] = useState<AlphaMeta | null>(null)
  const [alphaSource, setAlphaSource] = useState('')
  const [benchResult, setBenchResult] = useState<any>(null)
  const [benchLoading, setBenchLoading] = useState(false)
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (zooFilter) params.set('zoo', zooFilter)
    if (themeFilter) params.set('theme', themeFilter)
    if (univFilter) params.set('universe', univFilter)
    api.get('/alphas', { params }).then((r) => {
      setAlphas(r.data.alphas)
      setHealth(r.data.health)
    }).finally(() => setLoading(false))
  }, [zooFilter, themeFilter, univFilter])

  const viewSource = async (id: string) => {
    const r = await api.get(`/alphas/${id}/source`)
    setAlphaSource(r.data.source)
    setSelectedAlpha(alphas.find((a) => a.id === id) || null)
  }

  const runBench = async () => {
    setBenchLoading(true)
    const zoo = zooFilter || 'alpha101'
    try {
      const r = await api.post('/alphas/bench', {
        zoo,
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V'],
        start_date: '2024-01-01',
        end_date: '2025-01-01',
      })
      setBenchResult(r.data)
    } catch (e: any) {
      setBenchResult({ status: 'error', error: e.message })
    }
    setBenchLoading(false)
  }

  const filtered = alphas.filter((a) => !searchTerm || a.id.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <span className="font-bold text-[13px]">FACTOR ZOO</span>
        <span className="text-muted">|</span>
        <button onClick={() => setTab('browse')}
          className="border-0 cursor-pointer px-2 py-0.5"
          style={{ background: tab === 'browse' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'browse' ? '#3b82f6' : '#5d6b7e' }}>BROWSE</button>
        <button onClick={() => setTab('bench')}
          className="border-0 cursor-pointer px-2 py-0.5"
          style={{ background: tab === 'bench' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'bench' ? '#3b82f6' : '#5d6b7e' }}>BENCH</button>
        {health && <span className="ml-auto text-[9px] text-muted">{health.loaded} loaded / {health.failed} failed</span>}
      </div>

      {tab === 'browse' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[220px] border-r border-default p-2 overflow-auto">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search alphas..."
              className="w-full bg-card border border-default text-primary px-1.5 py-1 text-[10px] mb-2" />
            <div className="text-[9px] font-semibold text-muted mb-1">ZOO</div>
            <select value={zooFilter} onChange={(e) => setZooFilter(e.target.value)}
              className="w-full bg-card border border-default text-primary px-1 py-0.5 text-[10px] mb-2">
              <option value="">All Zoos</option>
              {ZOOS.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <div className="text-[9px] font-semibold text-muted mb-1">THEME</div>
            <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)}
              className="w-full bg-card border border-default text-primary px-1 py-0.5 text-[10px] mb-2">
              <option value="">All Themes</option>
              {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="text-[9px] font-semibold text-muted mb-1">UNIVERSE</div>
            <select value={univFilter} onChange={(e) => setUnivFilter(e.target.value)}
              className="w-full bg-card border border-default text-primary px-1 py-0.5 text-[10px]">
              <option value="">All Universes</option>
              {UNIVERSES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <div className="text-[9px] text-muted mt-2">{filtered.length} alphas</div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-auto">
              {loading ? <Spinner label="Loading alphas..." /> : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-muted text-[9px] text-left border-b border-default">
                      <th className="py-1 px-2">ID</th>
                      <th className="py-1 px-2">Zoo</th>
                      <th className="py-1 px-2">Theme</th>
                      <th className="py-1 px-2">Universe</th>
                      <th className="py-1 px-2">Decay</th>
                      <th className="py-1 px-2">Warmup</th>
                      <th className="py-1 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id} className="cursor-pointer" style={{ borderBottom: '1px solid rgba(26,35,50,0.3)' }}
                        onClick={() => viewSource(a.id)}>
                        <td className="py-[3px] px-2 text-accent-blue">{a.id}</td>
                        <td className="py-[3px] px-2">{a.zoo}</td>
                        <td className="py-[3px] px-2">{(a.meta?.theme || []).join(', ')}</td>
                        <td className="py-[3px] px-2">{(a.meta?.universe || []).join(', ')}</td>
                        <td className="py-[3px] px-2">{a.meta?.decay_horizon}</td>
                        <td className="py-[3px] px-2">{a.meta?.min_warmup_bars}</td>
                        <td className="py-[3px] px-2 text-[9px] text-muted">source→</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selectedAlpha && (
              <div className="w-[45%] border-l border-default overflow-auto p-2">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-accent-blue">{selectedAlpha.id}</span>
                  <button onClick={() => { setSelectedAlpha(null); setAlphaSource('') }}
                    className="bg-transparent border-0 text-muted cursor-pointer">✕</button>
                </div>
                <div className="text-[9px] mb-2">
                  <div className="text-muted mb-0.5">Formula:</div>
                  <div className="text-primary bg-card p-1 rounded-sm italic">{selectedAlpha.meta?.formula_latex || 'N/A'}</div>
                </div>
                <div className="text-muted text-[9px] mb-1">Source Code:</div>
                <pre className="text-primary bg-card p-2 rounded-sm overflow-auto max-h-[400px] whitespace-pre-wrap break-all text-[9px]">{alphaSource || 'No source available'}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'bench' && (
        <div className="flex-1 overflow-auto p-3">
          <div className="flex gap-2 items-center mb-3">
            <span className="text-[9px] text-muted">Zoo:</span>
            <select value={zooFilter} onChange={(e) => setZooFilter(e.target.value)}
              className="bg-card border border-default text-primary px-1.5 py-0.5 text-[10px]">
              {ZOOS.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <button onClick={runBench} disabled={benchLoading}
              className="border-0 text-white cursor-pointer px-3 py-1 text-[10px]"
              style={{ background: '#3b82f6', opacity: benchLoading ? 0.6 : 1 }}>
              {benchLoading ? 'RUNNING...' : 'RUN BENCH'}
            </button>
          </div>

          {benchResult && (
            <div>
              {benchResult.status === 'ok' ? (
                <>
                  <div className="flex gap-4 mb-3">
                    <div className="bg-card border border-default px-3 py-2 rounded">
                      <div className="text-[9px] text-muted">TESTED</div>
                      <div className="text-lg font-bold text-primary">{benchResult.n_alphas_tested}</div>
                    </div>
                    <div className="bg-card border border-default px-3 py-2 rounded">
                      <div className="text-[9px] text-muted">ALIVE</div>
                      <div className="text-lg font-bold text-up">{benchResult.alive}</div>
                    </div>
                    <div className="bg-card border border-default px-3 py-2 rounded">
                      <div className="text-[9px] text-muted">REVERSED</div>
                      <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>{benchResult.reversed}</div>
                    </div>
                    <div className="bg-card border border-default px-3 py-2 rounded">
                      <div className="text-[9px] text-muted">DEAD</div>
                      <div className="text-lg font-bold text-down">{benchResult.dead}</div>
                    </div>
                    <div className="bg-card border border-default px-3 py-2 rounded">
                      <div className="text-[9px] text-muted">WALL TIME</div>
                      <div className="text-lg font-bold text-primary">{benchResult.wall_seconds}s</div>
                    </div>
                  </div>

                  {benchResult.top5_by_ir?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] font-semibold text-muted mb-1">TOP 5 BY IR</div>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-muted text-[9px] text-left border-b border-default">
                            <th className="py-1 px-2">Alpha</th>
                            <th className="py-1 px-2">IC Mean</th>
                            <th className="py-1 px-2">IR</th>
                            <th className="py-1 px-2">Positive Ratio</th>
                            <th className="py-1 px-2">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {benchResult.rows?.sort((a: any, b: any) => b.ir - a.ir).slice(0, 10).map((r: any) => (
                            <tr key={r.id} style={{ borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                              <td className="py-[3px] px-2 text-accent-blue">{r.id}</td>
                              <td className="py-[3px] px-2">{r.ic_mean?.toFixed(4)}</td>
                              <td className="py-[3px] px-2 font-semibold" style={{ color: r.ir > 0.5 ? '#22c55e' : r.ir < -0.5 ? '#ef4444' : '#e6edf3' }}>{r.ir?.toFixed(3)}</td>
                              <td className="py-[3px] px-2">{(r.ic_positive_ratio * 100).toFixed(1)}%</td>
                              <td className="py-[3px] px-2">{r._category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {benchResult.by_theme && (
                    <div>
                      <div className="text-[10px] font-semibold text-muted mb-1">BY THEME</div>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(benchResult.by_theme).map(([theme, stats]: [string, any]) => (
                          <div key={theme} className="bg-card border border-default px-2.5 py-1.5 rounded text-[9px]">
                            <div className="font-semibold text-primary mb-0.5">{theme}</div>
                            <div className="text-muted">Alive: <span className="text-up">{stats.alive}</span> / Reversed: <span style={{ color: '#f59e0b' }}>{stats.reversed}</span> / Dead: <span className="text-down">{stats.dead}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-down text-[10px]">Error: {benchResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
