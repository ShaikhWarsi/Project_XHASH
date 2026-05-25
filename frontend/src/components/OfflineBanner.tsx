import { useState, useEffect } from 'react'

const CACHE_KEYS = ['portfolio_data', 'signals_data', 'backtest_results', 'market_ticker']

export function cacheData(key: string, data: unknown) {
  try {
    localStorage.setItem(`offline_${key}`, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {}
}

export function getCachedData<T>(key: string): { data: T; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(`offline_${key}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export function clearCache() {
  CACHE_KEYS.forEach((k) => localStorage.removeItem(`offline_${k}`))
}

interface OfflineBannerProps {
  lastSync?: string
}

export default function OfflineBanner({ lastSync }: OfflineBannerProps) {
  const [offline, setOffline] = useState(() => typeof window !== 'undefined' && !navigator.onLine)
  const [cacheInfo, setCacheInfo] = useState('')

  useEffect(() => {
    const onOffline = () => { setOffline(true); updateCacheInfo() }
    const onOnline = () => { setOffline(false) }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  const updateCacheInfo = () => {
    const cached = CACHE_KEYS.filter((k) => localStorage.getItem(`offline_${k}`))
    if (cached.length > 0) {
      setCacheInfo(`${cached.length} datasets cached`)
    }
  }

  useEffect(() => { if (offline) updateCacheInfo() }, [offline])

  if (!offline) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-toast)',
        background: 'var(--accent-yellow)',
        color: '#000',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        padding: '4px 12px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'transform 0.25s ease, opacity 0.25s ease',
      }}
    >
      <span style={{ fontWeight: 600 }}>Offline</span>
      <span style={{ opacity: 0.7 }}>—</span>
      <span>Showing cached data</span>
      {cacheInfo && (
        <>
          <span style={{ opacity: 0.7 }}>·</span>
          <span style={{ opacity: 0.7 }}>{cacheInfo}</span>
        </>
      )}
      {lastSync && (
        <>
          <span style={{ opacity: 0.7 }}>·</span>
          <span style={{ opacity: 0.7 }}>Last sync: {lastSync}</span>
        </>
      )}
      <button
        onClick={clearCache}
        style={{
          background: 'rgba(0,0,0,0.15)',
          border: 'none',
          color: '#000',
          cursor: 'pointer',
          fontSize: 9,
          padding: '1px 6px',
          borderRadius: 2,
        }}
      >
        CLEAR CACHE
      </button>
    </div>
  )
}
