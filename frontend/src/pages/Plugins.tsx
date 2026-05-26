import { useState, useCallback, useEffect } from 'react'
import { Download, Trash2, Search, Share2, Upload, Star } from 'lucide-react'
import Badge from '../components/ui/Badge'
import { useToastStore } from '../store/toast'

interface Plugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  type: 'indicator' | 'strategy' | 'data_source' | 'signal'
  enabled: boolean
  installed: boolean
  stars?: number
}

const AVAILABLE_PLUGINS: Plugin[] = [
  { id: 'mp1', name: 'Advanced MACD', version: '2.0.0', author: 'quantlab', description: 'MACD with histogram divergence detection and signal line cross alerts', type: 'indicator', enabled: false, installed: false, stars: 156 },
  { id: 'mp2', name: 'Elliott Wave Scanner', version: '1.5.0', author: 'waveanalyst', description: 'Automatic Elliott Wave pattern recognition across multiple timeframes', type: 'indicator', enabled: false, installed: false, stars: 89 },
  { id: 'mp3', name: 'Options Greeks Calculator', version: '1.0.0', author: 'optionpro', description: 'Real-time options Greeks (delta, gamma, theta, vega, rho) with IV surface', type: 'indicator', enabled: false, installed: false, stars: 234 },
  { id: 'mp4', name: 'Statistical Arbitrage', version: '0.8.0', author: 'pairtrade', description: 'Pairs trading with cointegration testing, z-score entry, and Kalman filter hedge', type: 'strategy', enabled: false, installed: false, stars: 178 },
  { id: 'mp5', name: 'ML Trend Predictor', version: '1.2.0', author: 'aiquant', description: 'LSTM-based trend prediction with feature engineering from 20+ technical indicators', type: 'signal', enabled: false, installed: false, stars: 312 },
  { id: 'mp6', name: 'Market Profile', version: '1.0.0', author: 'volumePro', description: 'Market profile TPO chart, volume profile, and value area calculation', type: 'indicator', enabled: false, installed: false, stars: 67 },
  { id: 'mp7', name: 'Iceberg Detection', version: '0.9.0', author: 'smartmoney', description: 'Real-time iceberg order detection using trade volume clustering and time-sales analysis', type: 'signal', enabled: false, installed: false, stars: 145 },
  { id: 'mp8', name: 'Alpha Factor Suite', version: '2.1.0', author: 'quantres', description: '101 WorldQuant-style alpha factors with ranking and decay analysis', type: 'signal', enabled: false, installed: false, stars: 423 },
  { id: 'mp9', name: 'Binance Spot Data', version: '1.3.0', author: 'cryptodata', description: 'Real-time and historical cryptocurrency data from Binance spot market', type: 'data_source', enabled: false, installed: false, stars: 56 },
  { id: 'mp10', name: 'SEC Filings Parser', version: '0.7.0', author: 'fundamentals', description: 'Parse SEC 10-K/10-Q filings for fundamental signals and sentiment', type: 'data_source', enabled: false, installed: false, stars: 92 },
]

const INSTALLED_PLUGINS: Plugin[] = [
  { id: 'p1', name: 'Ichimoku Cloud', version: '1.0.0', author: 'community', description: 'Complete Ichimoku Kinko Hyo indicator with cloud, span, and chikou span', type: 'indicator', enabled: true, installed: true, stars: 42 },
  { id: 'p2', name: 'Order Flow Imbalance', version: '0.9.0', author: 'core', description: 'Real-time order flow imbalance analysis from tick data', type: 'indicator', enabled: true, installed: true, stars: 38 },
  { id: 'p3', name: 'Mean Reversion Strategy', version: '2.1.0', author: 'community', description: 'Bollinger Band mean reversion with Z-score entry', type: 'strategy', enabled: true, installed: true, stars: 87 },
  { id: 'p4', name: 'Coinbase Pro Source', version: '1.0.0', author: 'core', description: 'Real-time cryptocurrency data from Coinbase Pro WebSocket', type: 'data_source', enabled: true, installed: true, stars: 25 },
  { id: 'p5', name: 'Social Sentiment Signal', version: '0.5.0', author: 'community', description: 'Twitter/Reddit sentiment analysis for signal generation', type: 'signal', enabled: true, installed: true, stars: 64 },
  { id: 'p6', name: 'VWAP + Volume Profile', version: '1.2.0', author: 'core', description: 'Volume Weighted Average Price with Volume Profile overlay', type: 'indicator', enabled: true, installed: true, stars: 55 },
  { id: 'p7', name: 'Futures Spread Trading', version: '1.0.0', author: 'community', description: 'Calendar spread and inter-commodity spread strategy', type: 'strategy', enabled: true, installed: true, stars: 31 },
  { id: 'p8', name: 'Polygon.io Data Feed', version: '0.8.0', author: 'core', description: 'Unified data feed from Polygon.io for stocks and options', type: 'data_source', enabled: true, installed: true, stars: 19 },
  { id: 'i1', name: 'Fibonacci Tools', version: '1.0.0', author: 'core', description: 'Fibonacci retracement, extension, and time zone drawing tools', type: 'indicator', enabled: true, installed: true },
  { id: 'i2', name: 'Pine Script Converter', version: '0.5.0', author: 'core', description: 'Convert TradingView Pine Script indicators to FinScript', type: 'indicator', enabled: true, installed: true },
]

const STORAGE_KEY = 'te_community_strategies'

interface SharedStrategy {
  id: string
  name: string
  author: string
  type: string
  description: string
  config: string
  stars: number
  sharedAt: string
}

function loadCommunityStrategies(): SharedStrategy[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveCommunityStrategies(strategies: SharedStrategy[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies))
}

const TYPE_COLORS: Record<string, string> = {
  indicator: '#22c55e', strategy: '#3b82f6', data_source: '#f59e0b', signal: '#a855f7',
}

export default function Plugins() {
  const [installed, setInstalled] = useState<Plugin[]>(INSTALLED_PLUGINS)
  const [available] = useState(AVAILABLE_PLUGINS)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace' | 'community'>('installed')
  const [community, setCommunity] = useState<SharedStrategy[]>(loadCommunityStrategies)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => { saveCommunityStrategies(community) }, [community])

  const togglePlugin = (id: string) => {
    setInstalled((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p))
  }

  const removePlugin = (id: string) => {
    setInstalled((prev) => prev.filter((p) => p.id !== id))
  }

  const installPlugin = (plugin: Plugin) => {
    if (installed.find((p) => p.id === plugin.id)) {
      addToast('Already installed', 'info')
      return
    }
    setInstalled((prev) => [...prev, { ...plugin, enabled: true, installed: true }])
    addToast(`Installed ${plugin.name}`, 'success')
  }

  const sharePlugin = useCallback((plugin: Plugin) => {
    const data: SharedStrategy = {
      id: Date.now().toString(36),
      name: plugin.name,
      author: plugin.author,
      type: plugin.type,
      description: plugin.description,
      config: JSON.stringify({ name: plugin.name, type: plugin.type, description: plugin.description }),
      stars: 0,
      sharedAt: new Date().toISOString(),
    }
    setCommunity((prev) => [data, ...prev])
    navigator.clipboard.writeText(JSON.stringify(data)).then(() => {
      addToast(`${plugin.name} shared to community + clipboard`, 'success')
    }).catch(() => {
      addToast(`${plugin.name} shared to community`, 'success')
    })
  }, [addToast])

  const importFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      const data = JSON.parse(text) as SharedStrategy
      if (data.name && data.type) {
        setCommunity((prev) => {
          if (prev.find((s) => s.name === data.name && s.author === data.author)) return prev
          return [{ ...data, id: Date.now().toString(36), stars: 0, sharedAt: new Date().toISOString() }, ...prev]
        })
        addToast(`Imported "${data.name}" from clipboard`, 'success')
      }
    } catch {
      addToast('No valid strategy data in clipboard', 'error')
    }
  }, [addToast])

  const starStrategy = useCallback((id: string) => {
    setCommunity((prev) => prev.map((s) => s.id === id ? { ...s, stars: (s.stars || 0) + 1 } : s))
  }, [])

  const removeCommunityStrategy = useCallback((id: string) => {
    setCommunity((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const filteredAvailable = available.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
  )

  const filteredCommunity = community.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b.stars || 0) - (a.stars || 0))

  return (
    <div className="flex flex-col h-full gap-1.5">
      <div className="flex items-center gap-2 py-1">
        <span className="font-mono-data text-[11px] font-bold text-up">PLUGIN MANAGER</span>
        <span className="font-mono-data text-[10px] text-muted flex-1">Extend the platform with community plugins</span>
        <button onClick={importFromClipboard} title="Import from clipboard"
          className="flex items-center gap-1 font-mono-data text-[9px] px-2 py-0.5 cursor-pointer border border-default rounded-sm bg-hover text-secondary">
          <Upload size={10} /> Import
        </button>
        <div className="flex gap-1">
          <button onClick={() => setActiveTab('installed')}
            className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${activeTab === 'installed' ? 'bg-accent-cyan text-black' : 'bg-card text-primary'}`}>
            INSTALLED ({installed.length})
          </button>
          <button onClick={() => setActiveTab('marketplace')}
            className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${activeTab === 'marketplace' ? 'bg-accent-cyan text-black' : 'bg-card text-primary'}`}>
            MARKETPLACE ({available.length})
          </button>
          <button onClick={() => setActiveTab('community')}
            className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${activeTab === 'community' ? 'bg-accent-cyan text-black' : 'bg-card text-primary'}`}>
            COMMUNITY ({community.length})
          </button>
        </div>
      </div>

      {(activeTab === 'marketplace' || activeTab === 'community') && (
        <div className="flex gap-1">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
              className="bg-card border border-default text-primary font-mono-data text-[11px] pl-6 pr-2 py-0.5 outline-none w-full rounded-sm" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto flex flex-col gap-1">
        {activeTab === 'installed' && installed.map((plugin) => (
          <div key={plugin.id} className="bg-card border border-default rounded px-2.5 py-2 font-mono-data text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-xs" style={{ background: TYPE_COLORS[plugin.type] }} />
              <span className="font-semibold text-primary">{plugin.name}</span>
              <span className="text-[9px] text-muted">v{plugin.version}</span>
              <span className="text-[9px] uppercase px-1 rounded-sm" style={{ color: TYPE_COLORS[plugin.type], background: `${TYPE_COLORS[plugin.type]}22` }}>{plugin.type.replace('_', ' ')}</span>
              <span className="text-[9px] text-muted">by {plugin.author}</span>
              <div className="flex-1" />
              <button onClick={() => sharePlugin(plugin)} title="Share with community"
                className="flex items-center gap-1 font-mono-data text-[9px] px-1.5 py-0.5 cursor-pointer border border-default rounded-sm text-muted bg-hover">
                <Share2 size={10} />
              </button>
              <button onClick={() => togglePlugin(plugin.id)}
                style={{ background: plugin.enabled ? '#22c55e' : 'var(--bg-app)', color: plugin.enabled ? '#000' : 'var(--text-muted)' }}
                className="font-mono-data text-[9px] px-2 py-0.5 cursor-pointer border border-default rounded-sm">
                {plugin.enabled ? 'ENABLED' : 'DISABLED'}
              </button>
              <button onClick={() => removePlugin(plugin.id)} className="bg-none border-none text-down cursor-pointer p-0.5">
                <Trash2 size={12} />
              </button>
            </div>
            <div className="text-[10px] text-muted mt-1">{plugin.description}</div>
          </div>
        ))}

        {activeTab === 'marketplace' && filteredAvailable.map((plugin) => (
          <div key={plugin.id} className="bg-card border border-default rounded px-2.5 py-2 font-mono-data text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-xs" style={{ background: TYPE_COLORS[plugin.type] }} />
              <span className="font-semibold text-primary">{plugin.name}</span>
              <span className="text-[9px] text-muted">v{plugin.version}</span>
              <span className="text-[9px] uppercase px-1 rounded-sm" style={{ color: TYPE_COLORS[plugin.type], background: `${TYPE_COLORS[plugin.type]}22` }}>{plugin.type.replace('_', ' ')}</span>
              <span className="text-[9px] text-muted">by {plugin.author}</span>
              {plugin.stars && <span className="text-[9px] text-accent-yellow">★ {plugin.stars}</span>}
              <div className="flex-1" />
              <button onClick={() => installPlugin(plugin)}
                className="flex items-center gap-1 bg-accent-cyan text-black border-none font-mono-data text-[9px] px-2 py-0.5 cursor-pointer rounded-sm">
                <Download size={10} /> INSTALL
              </button>
            </div>
            <div className="text-[10px] text-muted mt-1">{plugin.description}</div>
          </div>
        ))}
        {activeTab === 'marketplace' && filteredAvailable.length === 0 && (
          <div className="font-mono-data text-[11px] text-muted text-center py-5">No plugins match your search.</div>
        )}

        {activeTab === 'community' && (
          <>
            {filteredCommunity.length > 0 ? (
              filteredCommunity.map((s) => (
                <div key={s.id} className="bg-card border border-default rounded px-2.5 py-2 font-mono-data text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-xs" style={{ background: TYPE_COLORS[s.type] || '#888' }} />
                    <span className="font-semibold text-primary">{s.name}</span>
                    <span className="text-[9px] uppercase px-1 rounded-sm" style={{ color: TYPE_COLORS[s.type] || '#888', background: `${TYPE_COLORS[s.type] || '#888'}22` }}>{s.type}</span>
                    <span className="text-[9px] text-muted">by {s.author}</span>
                    <div className="flex-1" />
                    <button onClick={() => starStrategy(s.id)}
                      className="flex items-center gap-1 font-mono-data text-[9px] px-1.5 py-0.5 cursor-pointer border border-default rounded-sm text-accent-yellow">
                      <Star size={10} /> {s.stars || 0}
                    </button>
                    <button onClick={() => {
                      const plugin: Plugin = { id: s.id, name: s.name, version: '1.0.0', author: s.author, description: s.description, type: s.type as any, enabled: true, installed: true }
                      installPlugin(plugin)
                    }}
                      className="flex items-center gap-1 bg-accent-cyan text-black border-none font-mono-data text-[9px] px-2 py-0.5 cursor-pointer rounded-sm">
                      <Download size={10} /> INSTALL
                    </button>
                    <button onClick={() => removeCommunityStrategy(s.id)} className="bg-none border-none text-down cursor-pointer p-0.5">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-muted mt-1">{s.description}</div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="font-mono-data text-[11px] text-muted">No community strategies yet</div>
                <div className="font-mono-data text-[10px] text-secondary">Share your installed plugins to start building the community</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
