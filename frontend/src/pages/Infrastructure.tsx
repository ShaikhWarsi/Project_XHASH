import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Shield, Filter, Cpu, Activity, Clock } from 'lucide-react'
import Spinner from '../components/Spinner'
import ProtectionsPanel from '../components/ProtectionsPanel'
import PairlistsPanel from '../components/PairlistsPanel'
import { useToastStore } from '../store/toast'

type Tab = 'providers' | 'mcp' | 'cache' | 'protections' | 'pairlists' | 'health' | 'scheduler'

interface JobItem {
  name: string
  next_run: string
  interval: string
  status: 'Active' | 'Paused'
}

interface RouteCacheStats {
  route: string
  hits: number
  misses: number
  hit_rate: number
}

function timeAgo(ts: string): string {
  if (!ts) return 'never'
  const diff = Date.now() - new Date(ts).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function colorForUsage(val: number): string {
  if (val < 50) return 'var(--accent-green)'
  if (val < 80) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function randAround(base: number, range: number): number {
  return Math.round((base + (Math.random() - 0.5) * range) * 10) / 10
}

export default function Infrastructure() {
  const [tab, setTab] = useState<Tab>('providers')
  const [providers, setProviders] = useState<any[]>([])
  const [mcpTools, setMcpTools] = useState<any[]>([])
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshingProviders, setRefreshingProviders] = useState(false)
  const [health, setHealth] = useState<{ cpu: number; memory: number; latency_p50: number; latency_p95: number; latency_p99: number; queueDepth: number } | null>(null)
  const [schedulerJobs, setSchedulerJobs] = useState<JobItem[]>([
    { name: 'Market Data Sync', next_run: new Date(Date.now() + 300000).toISOString(), interval: '5m', status: 'Active' },
    { name: 'Signal Computation', next_run: new Date(Date.now() + 600000).toISOString(), interval: '10m', status: 'Active' },
    { name: 'Portfolio Rebalance', next_run: new Date(Date.now() + 3600000).toISOString(), interval: '1h', status: 'Active' },
    { name: 'Risk Check', next_run: new Date(Date.now() + 1800000).toISOString(), interval: '30m', status: 'Active' },
    { name: 'Order Execution Sweep', next_run: new Date(Date.now() + 120000).toISOString(), interval: '2m', status: 'Active' },
    { name: 'Performance Snapshot', next_run: new Date(Date.now() + 7200000).toISOString(), interval: '2h', status: 'Paused' },
    { name: 'Backtest Queue Poll', next_run: new Date(Date.now() + 15000).toISOString(), interval: '15s', status: 'Active' },
    { name: 'Alert Dispatch', next_run: new Date(Date.now() + 45000).toISOString(), interval: '45s', status: 'Active' },
    { name: 'Cache Eviction', next_run: new Date(Date.now() + 86400000).toISOString(), interval: '24h', status: 'Paused' },
    { name: 'Data Provider Health Check', next_run: new Date(Date.now() + 300000).toISOString(), interval: '5m', status: 'Active' },
  ])
  const [dbPoolStats, setDbPoolStats] = useState({ active: 4, idle: 6, max_pool_size: 20, waiting_queries: 0 })
  const [routeCacheStats, setRouteCacheStats] = useState<RouteCacheStats[]>([
    { route: '/api/backtest', hits: 342, misses: 58, hit_rate: 85.5 },
    { route: '/api/ohlcv', hits: 1201, misses: 120, hit_rate: 90.9 },
    { route: '/api/signals', hits: 567, misses: 89, hit_rate: 86.4 },
    { route: '/api/portfolio', hits: 234, misses: 34, hit_rate: 87.3 },
    { route: '/api/trades', hits: 89, misses: 12, hit_rate: 88.1 },
  ])
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/providers/').then(r => setProviders(r.data.providers || [])).catch(() => { addToast('Providers load failed', 'error') }),
      api.get('/mcp/tools').then(r => setMcpTools(r.data.tools || [])).catch(() => { addToast('MCP tools load failed', 'error') }),
      api.get('/backtest-cache/stats').then(r => setCacheStats(r.data)).catch(() => { addToast('Cache stats load failed', 'error') }),
      api.get('/db/stats').then(r => setDbPoolStats(r.data)).catch(() => { addToast('DB stats load failed', 'error') }),
      api.get('/cache/stats/routes').then(r => setRouteCacheStats(r.data.routes || r.data || [])).catch(() => { addToast('Route cache stats load failed', 'error') }),
      api.get('/scheduler/jobs').then(r => setSchedulerJobs(r.data.jobs || r.data || [])).catch(() => { addToast('Scheduler jobs load failed', 'error') }),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'health') return
    const fetchHealth = () => {
      api.get('/health/metrics')
        .then((r: any) => { if (r.data) setHealth(r.data) })
        .catch(() => { /* health metrics are best-effort */ })
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [tab])

  const refreshAllProviders = async () => {
    setRefreshingProviders(true)
    try {
      await api.post('/providers/refresh')
      addToast('All providers refreshed', 'success')
      const res = await api.get('/providers/')
      setProviders(res.data.providers || [])
    } catch (e) {
      addToast(`Failed to refresh providers: ${(e as Error).message}`, 'error')
    }
    setRefreshingProviders(false)
  }

  const toggleJob = (idx: number) => {
    setSchedulerJobs((jobs) => jobs.map((j, i) => i === idx ? { ...j, status: j.status === 'Active' ? 'Paused' as const : 'Active' as const } : j))
  }

  const runJobNow = async (name: string) => {
    try {
      await api.post(`/scheduler/jobs/${name}/run`)
      addToast(`Job "${name}" triggered`, 'success')
    } catch (e) {
      addToast(`Failed to run job "${name}": ${(e as Error).message}`, 'error')
    }
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <Cpu size={12} /><span className="font-bold text-sm">INFRASTRUCTURE</span>
        <span className="text-[#5d6b7e]">|</span>
        <button onClick={() => setTab('providers')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'providers' ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none', color: tab === 'providers' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          PROVIDERS
        </button>
        <button onClick={() => setTab('mcp')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'mcp' ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none', color: tab === 'mcp' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          MCP
        </button>
        <button onClick={() => setTab('cache')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'cache' ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none', color: tab === 'cache' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          CACHE
        </button>
        <button onClick={() => setTab('protections')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'protections' ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none', color: tab === 'protections' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          PROTECTIONS
        </button>
        <button onClick={() => setTab('pairlists')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'pairlists' ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none', color: tab === 'pairlists' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          PAIRLISTS
        </button>
        <button onClick={() => setTab('health')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'health' ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none', color: tab === 'health' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          <Activity size={10} className="mr-1" />HEALTH
        </button>
        <button onClick={() => setTab('scheduler')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'scheduler' ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none', color: tab === 'scheduler' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
          <Clock size={10} className="mr-1" />SCHEDULER
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <Spinner label="Loading infrastructure..." />
        ) : tab === 'providers' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-semibold text-[#5d6b7e]">DATA PROVIDERS ({providers.length})</div>
              <button
                onClick={refreshAllProviders}
                disabled={refreshingProviders}
                className="text-[10px] font-mono px-2 py-1 rounded-sm cursor-pointer"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                {refreshingProviders ? 'Refreshing...' : 'Refresh All'}
              </button>
            </div>
            {providers.length === 0 ? (
              <div className="text-[#5d6b7e] text-[10px]">No providers registered</div>
            ) : (
              providers.map((p, i) => (
                <div key={i} className="bg-card border border-default px-2 py-1.5 rounded mb-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                        background: (p.status === 'ok' || p.healthy) ? 'var(--accent-green)' : 'var(--accent-red)',
                      }} />
                      <span className="font-semibold text-[10px]">{p.name}</span>
                    </div>
                    <span className="text-[8px] text-[#5d6b7e]">{p.models?.length || 0} models</span>
                  </div>
                  {p.description && <div className="text-[9px] text-[#5d6b7e] mt-0.5">{p.description}</div>}
                  <div className="flex gap-3 mt-1 text-[8px]" style={{ color: 'var(--text-muted)' }}>
                    <span>Last Fetch: {timeAgo(p.last_fetch || p.last_updated)}</span>
                    <span>Error Rate: {p.error_rate != null ? `${p.error_rate}%` : '0%'}</span>
                  </div>
                  {p.models?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {p.models.map((m: string) => (
                        <span key={m} className="px-1.5 py-0 rounded-sm text-[8px]" style={{ background: 'color-mix(in srgb, var(--accent-blue) 10%, transparent)', color: 'var(--accent-blue)' }}>{m}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'mcp' && (
          <div>
            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1">MCP TOOLS ({mcpTools.length})</div>
            {mcpTools.length === 0 ? (
              <div className="text-[#5d6b7e] text-[10px]">MCP server not running. Start with: <span className="text-[#3b82f6]">trading-engine-mcp</span></div>
            ) : (
              mcpTools.map((t, i) => (
                <div key={i} className="bg-card border border-default px-2 py-1.5 rounded mb-1">
                  <div className="font-semibold text-[10px] text-[#3b82f6]">{t.name}</div>
                  <div className="text-[9px] text-[#5d6b7e]">{t.description}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'cache' && (
          <div>
            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1">BACKTEST CACHE</div>
            {cacheStats ? (
              <div className="flex gap-2 flex-wrap mb-3">
                <div className="bg-card border border-default px-3.5 py-2.5 rounded">
                  <div className="text-[9px] text-[#5d6b7e]">CACHED RESULTS</div>
                  <div className="text-[20px] font-bold text-[#3b82f6]">{cacheStats.count}</div>
                </div>
                <div className="bg-card border border-default px-3.5 py-2.5 rounded">
                  <div className="text-[9px] text-[#5d6b7e]">DISK USAGE</div>
                  <div className="text-[20px] font-bold">{cacheStats.size_mb || 0} MB</div>
                </div>
              </div>
            ) : (
              <div className="text-[#5d6b7e] text-[10px] mb-3">Cache directory not accessible</div>
            )}

            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1 mt-3">DB POOL STATS</div>
            <div className="flex gap-2 flex-wrap mb-3">
              <div className="bg-card border border-default px-3 py-2 rounded">
                <div className="text-[9px] text-[#5d6b7e]">ACTIVE CONNECTIONS</div>
                <div className="text-[16px] font-bold" style={{ color: dbPoolStats.active > 15 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{dbPoolStats.active}</div>
              </div>
              <div className="bg-card border border-default px-3 py-2 rounded">
                <div className="text-[9px] text-[#5d6b7e]">IDLE CONNECTIONS</div>
                <div className="text-[16px] font-bold">{dbPoolStats.idle}</div>
              </div>
              <div className="bg-card border border-default px-3 py-2 rounded">
                <div className="text-[9px] text-[#5d6b7e]">MAX POOL SIZE</div>
                <div className="text-[16px] font-bold">{dbPoolStats.max_pool_size}</div>
              </div>
              <div className="bg-card border border-default px-3 py-2 rounded">
                <div className="text-[9px] text-[#5d6b7e]">WAITING QUERIES</div>
                <div className="text-[16px] font-bold" style={{ color: dbPoolStats.waiting_queries > 0 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>{dbPoolStats.waiting_queries}</div>
              </div>
            </div>

            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1 mt-3">CACHE HIT/MISS PER ROUTE</div>
            {routeCacheStats.length > 0 ? (
              <table className="w-full text-[10px] font-mono" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Route</th>
                    <th className="text-right py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Hits</th>
                    <th className="text-right py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Misses</th>
                    <th className="text-right py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Hit Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {routeCacheStats.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-1 px-1.5" style={{ color: 'var(--text-primary)' }}>{r.route}</td>
                      <td className="py-1 px-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>{r.hits}</td>
                      <td className="py-1 px-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>{r.misses}</td>
                      <td className="py-1 px-1.5 text-right" style={{ color: r.hit_rate >= 85 ? 'var(--accent-green)' : r.hit_rate >= 70 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{r.hit_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-[#5d6b7e] text-[10px]">No route cache data available</div>
            )}
          </div>
        )}

        {tab === 'protections' && <ProtectionsPanel />}

        {tab === 'pairlists' && <PairlistsPanel />}

        {tab === 'health' && (
          <div>
            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-2">SYSTEM HEALTH (refreshes every 5s)</div>
            {!health ? (
              <div className="text-[10px] font-mono text-[#5d6b7e]">Waiting for health metrics...</div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-card border border-default px-3 py-2.5 rounded">
                  <div className="text-[9px] text-[#5d6b7e] mb-1">CPU USAGE</div>
                  <div className="text-[24px] font-bold" style={{ color: colorForUsage(health.cpu) }}>{health.cpu}%</div>
                </div>
                <div className="bg-card border border-default px-3 py-2.5 rounded">
                  <div className="text-[9px] text-[#5d6b7e] mb-1">MEMORY USAGE</div>
                  <div className="text-[24px] font-bold" style={{ color: colorForUsage(health.memory) }}>{health.memory}%</div>
                </div>
                <div className="bg-card border border-default px-3 py-2.5 rounded">
                  <div className="text-[9px] text-[#5d6b7e] mb-1">LATENCY (ms)</div>
                  <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    p50: {health.latency_p50}ms
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    p95: {health.latency_p95}ms | p99: {health.latency_p99}ms
                  </div>
                </div>
                <div className="bg-card border border-default px-3 py-2.5 rounded">
                  <div className="text-[9px] text-[#5d6b7e] mb-1">QUEUE DEPTH</div>
                  <div className="text-[24px] font-bold" style={{ color: health.queueDepth > 10 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{health.queueDepth}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'scheduler' && (
          <div>
            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1">SCHEDULED JOBS</div>
            {schedulerJobs.length > 0 ? (
              <table className="w-full text-[10px] font-mono" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Job Name</th>
                    <th className="text-left py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Next Run</th>
                    <th className="text-left py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Interval</th>
                    <th className="text-left py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th className="text-right py-1 px-1.5" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedulerJobs.slice(0, 10).map((job, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-1.5 px-1.5" style={{ color: 'var(--text-primary)' }}>{job.name}</td>
                      <td className="py-1.5 px-1.5" style={{ color: 'var(--text-secondary)' }}>{timeAgo(job.next_run)}</td>
                      <td className="py-1.5 px-1.5" style={{ color: 'var(--text-secondary)' }}>{job.interval}</td>
                      <td className="py-1.5 px-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm" style={{
                          background: job.status === 'Active' ? 'color-mix(in srgb, var(--accent-green) 8%, transparent)' : 'var(--bg-hover)',
                          color: job.status === 'Active' ? 'var(--accent-green)' : 'var(--text-muted)',
                        }}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleJob(i)}
                            className="text-[9px] px-1.5 py-0.5 rounded-sm cursor-pointer"
                            style={{ background: 'none', border: '1px solid var(--border-color)', color: job.status === 'Active' ? 'var(--accent-yellow)' : 'var(--accent-green)' }}
                          >
                            {job.status === 'Active' ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => runJobNow(job.name)}
                            className="text-[9px] px-1.5 py-0.5 rounded-sm cursor-pointer"
                            style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--accent-blue)' }}
                          >
                            Run Now
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-[#5d6b7e] text-[10px]">No scheduled jobs</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
