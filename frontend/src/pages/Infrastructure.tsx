import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Database, Shield, Filter, Cpu } from 'lucide-react'
import Spinner from '../components/Spinner'

type Tab = 'providers' | 'mcp' | 'cache' | 'protections' | 'pairlists'

export default function Infrastructure() {
  const [tab, setTab] = useState<Tab>('providers')
  const [providers, setProviders] = useState<any[]>([])
  const [mcpTools, setMcpTools] = useState<any[]>([])
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/providers/').then(r => setProviders(r.data.providers || [])).catch(() => {}),
      api.get('/mcp/tools').then(r => setMcpTools(r.data.tools || [])).catch(() => {}),
      api.get('/backtest-cache/stats').then(r => setCacheStats(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <Cpu size={12} /><span className="font-bold text-sm">INFRASTRUCTURE</span>
        <span className="text-[#5d6b7e]">|</span>
        <button onClick={() => setTab('providers')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'providers' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'providers' ? '#3b82f6' : '#5d6b7e' }}>
          <Database size={10} className="mr-1" />Providers
        </button>
        <button onClick={() => setTab('mcp')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'mcp' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'mcp' ? '#3b82f6' : '#5d6b7e' }}>
          MCP Tools
        </button>
        <button onClick={() => setTab('cache')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'cache' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'cache' ? '#3b82f6' : '#5d6b7e' }}>
          Backtest Cache
        </button>
        <button onClick={() => setTab('protections')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'protections' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'protections' ? '#3b82f6' : '#5d6b7e' }}>
          <Shield size={10} className="mr-1" />Protections
        </button>
        <button onClick={() => setTab('pairlists')} className="cursor-pointer px-2 py-0.5 text-[10px] border-none" style={{ background: tab === 'pairlists' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'pairlists' ? '#3b82f6' : '#5d6b7e' }}>
          <Filter size={10} className="mr-1" />Pairlists
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <Spinner label="Loading infrastructure..." />
        ) : tab === 'providers' && (
          <div>
            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1">DATA PROVIDERS ({providers.length})</div>
            {providers.length === 0 ? (
              <div className="text-[#5d6b7e] text-[10px]">No providers registered</div>
            ) : (
              providers.map((p, i) => (
                <div key={i} className="bg-card border border-default px-2 py-1.5 rounded mb-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[10px]">{p.name}</span>
                    <span className="text-[8px] text-[#5d6b7e]">{p.models?.length || 0} models</span>
                  </div>
                  {p.description && <div className="text-[9px] text-[#5d6b7e] mt-0.5">{p.description}</div>}
                  {p.models?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {p.models.map((m: string) => (
                        <span key={m} className="px-1.5 py-0 rounded-sm text-[8px]" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{m}</span>
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
              <div className="flex gap-2 flex-wrap">
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
              <div className="text-[#5d6b7e] text-[10px]">Cache directory not accessible</div>
            )}
          </div>
        )}

        {tab === 'protections' && (
          <div>
            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1">PROTECTION PLUGINS</div>
            {[
              { name: 'Max Drawdown Guard', desc: 'Stops trading if drawdown exceeds threshold (default 25%)' },
              { name: 'Cooldown Period', desc: 'Pauses trading after N consecutive losses (default 5)' },
              { name: 'Max Daily Loss', desc: 'Stops trading if daily loss exceeds threshold (default 5%)' },
              { name: 'Min Trades Guard', desc: 'Requires minimum trades before allowing trading (default 3)' },
            ].map((p, i) => (
              <div key={i} className="bg-card border border-default px-2 py-1.5 rounded mb-1">
                <div className="font-semibold text-[10px]">{p.name}</div>
                <div className="text-[9px] text-[#5d6b7e]">{p.desc}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pairlists' && (
          <div>
            <div className="text-[10px] font-semibold text-[#5d6b7e] mb-1">PAIRLIST FILTERS</div>
            {[
              { name: 'Volume Filter', desc: 'Filters by minimum average volume (default 1M)' },
              { name: 'Volatility Filter', desc: 'Filters by volatility range (default 0-5%)' },
              { name: 'Spread Filter', desc: 'Filters by bid-ask spread (default max 1%)' },
              { name: 'Price Filter', desc: 'Filters by price range (default $1+)' },
              { name: 'Market Cap Filter', desc: 'Filters by market cap range (default $100M+)' },
              { name: 'Performance Filter', desc: 'Filters by recent performance (30d return)' },
            ].map((p, i) => (
              <div key={i} className="bg-card border border-default px-2 py-1.5 rounded mb-1">
                <div className="font-semibold text-[10px]">{p.name}</div>
                <div className="text-[9px] text-[#5d6b7e]">{p.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
