import { useEffect, useState } from 'react'
import Card from './ui/Card'
import { fetchCacheStats, invalidateCache } from '../api/backtestCache'
import type { CacheStats } from '../api/backtestCache'
import { useToastStore } from '../store/toast'

const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

export default function CacheStatsPanel() {
  const addToast = useToastStore((s) => s.addToast)
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchCacheStats()
      setStats(data)
    } catch {
      setStats(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleInvalidate = async () => {
    try {
      const res = await invalidateCache()
      addToast(`Invalidated ${res.invalidated} cache entries`, 'info')
      load()
    } catch {
      addToast('Cache invalidation failed', 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '8px 0', ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center' }}>
        Loading cache stats...
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ padding: '8px 0', ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center' }}>
        Cache unavailable
      </div>
    )
  }

  const usagePct = stats.max_size > 0 ? ((stats.size / stats.max_size) * 100).toFixed(0) : 0
  const hitRate = stats.hits + stats.misses > 0
    ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(0)
    : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Card title="CACHE STATS" padding="compact">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>ENTRIES</div>
            <div style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)' }}>{stats.entries}</div>
          </div>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>HIT RATE</div>
            <div style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--accent-green)' }}>{hitRate}%</div>
          </div>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>SIZE</div>
            <div style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)' }}>
              {(stats.size / 1024).toFixed(1)}KB
            </div>
          </div>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>USAGE</div>
            <div style={{ ...FONT_DATA, fontWeight: 600, color: Number(usagePct) > 80 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {usagePct}%
            </div>
          </div>
        </div>
        <div style={{ marginTop: 4, background: 'var(--border-color)', height: 4, borderRadius: 2 }}>
          <div
            style={{
              width: `${usagePct}%`,
              height: '100%',
              background: Number(usagePct) > 80 ? 'var(--accent-red)' : 'var(--accent-cyan)',
              borderRadius: 2,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </Card>
      <button
        onClick={handleInvalidate}
        style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--accent-red)',
          padding: '3px 12px',
          ...FONT_SM,
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        INVALIDATE CACHE
      </button>
    </div>
  )
}
