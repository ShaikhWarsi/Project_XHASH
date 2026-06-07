import { memo, useMemo, useState } from 'react'
import type { BarData } from '../../api/types'

type VpMode = 'session' | 'anchored' | 'fixed'

interface VolumeBucket {
  priceLow: number
  priceHigh: number
  volume: number
  direction: 'buy' | 'sell' | 'neutral'
}

interface VolumeProfileProps {
  data: BarData[]
  onClose?: () => void
}

function computeVolumeProfile(data: BarData[], bucketCount = 30): { buckets: VolumeBucket[]; poc: VolumeBucket | null; maxVol: number } {
  if (data.length === 0) return { buckets: [], poc: null, maxVol: 0 }

  const prices = data.flatMap((d) => [d.high, d.low])
  let minPrice = prices[0] ?? 0
  let maxPrice = minPrice
  for (const p of prices) {
    if (p < minPrice) minPrice = p
    if (p > maxPrice) maxPrice = p
  }
  const range = maxPrice - minPrice
  if (range === 0) return { buckets: [], poc: null, maxVol: 0 }

  const bucketSize = range / bucketCount

  const buckets: VolumeBucket[] = []
  for (let i = 0; i < bucketCount; i++) {
    const low = minPrice + i * bucketSize
    const high = low + bucketSize
    buckets.push({ priceLow: low, priceHigh: high, volume: 0, direction: 'neutral' })
  }

  let buyVol = 0
  let sellVol = 0

  for (const bar of data) {
    const avgPrice = (bar.open + bar.high + bar.low + bar.close) / 4
    const idx = Math.min(Math.floor((avgPrice - minPrice) / bucketSize), bucketCount - 1)
    if (idx < 0 || idx >= bucketCount) continue
    buckets[idx].volume += bar.volume || 0
    if (bar.close > bar.open) {
      buckets[idx].direction = 'buy'
      buyVol += bar.volume || 0
    } else if (bar.close < bar.open) {
      buckets[idx].direction = 'sell'
      sellVol += bar.volume || 0
    }
  }

  // Recompute direction as aggregate for overall context (used only when no per-bar direction)
  const overallDirection = buyVol > sellVol ? 'buy' : sellVol > buyVol ? 'sell' : 'neutral'

  // Mark any bucket that still has neutral direction based on overall context
  for (const bucket of buckets) {
    if (bucket.direction === 'neutral') {
      bucket.direction = overallDirection
    }
  }

  let maxVol = 1
  for (const b of buckets) {
    if (b.volume > maxVol) maxVol = b.volume
  }
  const poc = buckets.reduce((best, b) => (b.volume > best.volume ? b : best), buckets[0])

  return { buckets, poc, maxVol }
}

function VolumeProfile({ data, onClose }: VolumeProfileProps) {
  const [vpMode, setVpMode] = useState<VpMode>('session')
  const { buckets, poc, maxVol } = useMemo(() => computeVolumeProfile(data), [data])
  const isEmpty = data.length === 0 || buckets.length === 0
  const MODES: { key: VpMode; label: string }[] = [
    { key: 'session', label: 'Session' },
    { key: 'anchored', label: 'Anchored' },
    { key: 'fixed', label: 'Fixed' },
  ]

  return (
    <div
      style={{
        width: 150,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 4,
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px',
          borderBottom: '1px solid var(--border-color)',
          fontSize: 8,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        <span>Volume Profile</span>
        {poc && (
          <span style={{ fontSize: 7, color: 'var(--accent-blue)' }}>
            POC {(poc.priceLow + poc.priceHigh) / 2 > 1000
              ? ((poc.priceLow + poc.priceHigh) / 2).toFixed(0)
              : ((poc.priceLow + poc.priceHigh) / 2).toFixed(2)}
          </span>
        )}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 9,
              padding: 0,
              lineHeight: 1,
            }}
          >
            &#x2715;
          </button>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 1,
          padding: '2px 4px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}
      >
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setVpMode(m.key)}
            style={{
              flex: 1,
              background: vpMode === m.key ? 'var(--accent-cyan)' : 'transparent',
              border: 'none',
              color: vpMode === m.key ? '#000' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 7,
              fontWeight: vpMode === m.key ? 700 : 400,
              padding: '2px 0',
              borderRadius: 2,
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      {isEmpty ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            color: 'var(--text-muted)',
            padding: 16,
          }}
        >
          No data
        </div>
      ) : (
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '2px 0',
        }}
      >
        {[...buckets].reverse().map((bucket, ri) => {
          const pct = maxVol > 0 ? bucket.volume / maxVol : 0
          const isPoc = poc === bucket
          let barColor = 'var(--text-muted)'
          if (isPoc) {
            barColor = 'var(--accent-blue)'
          } else if (bucket.direction === 'buy') {
            barColor = 'var(--accent-green)'
          } else if (bucket.direction === 'sell') {
            barColor = 'var(--accent-red)'
          }
          const avgPrice = (bucket.priceLow + bucket.priceHigh) / 2
          const priceLabel = avgPrice > 1000 ? avgPrice.toFixed(0) : avgPrice.toFixed(2)
          return (
            <div
              key={ri}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                height: 14,
                padding: '0 4px',
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontSize: 7,
                  color: 'var(--text-muted)',
                  width: 48,
                  textAlign: 'right',
                  flexShrink: 0,
                  lineHeight: '14px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {priceLabel}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(pct * 100, 2)}%`,
                    background: barColor,
                    opacity: isPoc ? 1 : 0.6,
                    borderRadius: 1,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

export default memo(VolumeProfile)
