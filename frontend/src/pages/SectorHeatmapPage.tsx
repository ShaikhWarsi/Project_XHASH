import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import SectorAllocationChart from '../components/SectorAllocationChart'

interface SectorData {
  name: string
  etf: string
  change: number
  color: string
}

export default function SectorHeatmapPage() {
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/calendar/sectors')
      .then(r => r.json())
      .then(data => { setSectors(Array.isArray(data) ? data : []); setLoading(false) })
      .catch((err) => { setError(err.message || 'Failed to load sectors'); setLoading(false) })
  }, [])

  const chartData = sectors.map(s => ({
    name: s.name,
    exposure: Math.abs(s.change),
    color: s.change >= 0 ? '#22c55e' : '#ef4444',
    children: [],
  }))

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="SECTOR HEATMAP">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 10 }}>Loading sectors...</div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#ef4444', fontSize: 10 }}>{error}</div>
        ) : (
          <div style={{ padding: 12 }}>
            <SectorAllocationChart sectors={chartData} size={400} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6, marginTop: 12 }}>
              {sectors.map(s => (
                <div key={s.name} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 4, padding: 8 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 9, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ color: s.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {s.change >= 0 ? '+' : ''}{s.change}%
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 7 }}>{s.etf}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
