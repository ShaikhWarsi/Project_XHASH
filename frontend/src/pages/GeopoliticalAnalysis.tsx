import { useState, useMemo } from 'react'
import { api } from '../api/client'
import { useToastStore } from '../store/toast'

function generateMeetingDates(year: number, firstMonth: number, dayOfWeek: number, count: number): string[] {
  const dates: string[] = []
  const d = new Date(year, firstMonth, 1)
  while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1)
  for (let i = 0; i < count; i++) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 42)
  }
  return dates
}

const CENTRAL_BANK_DATES: Record<string, string[]> = {
  FOMC: generateMeetingDates(2026, 0, 3, 7),
  ECB: generateMeetingDates(2026, 0, 4, 7),
  BOJ: generateMeetingDates(2026, 0, 2, 7),
  BOE: generateMeetingDates(2026, 0, 4, 7),
}

const COUNTRIES = ['US', 'EU', 'CN', 'JP', 'UK', 'RU', 'IN', 'BR', 'AU', 'SA', 'KR', 'SG']

function CentralBankCountdown({ bank }: { bank: string }) {
  const now = Date.now()
  const dates = CENTRAL_BANK_DATES[bank] || []
  const nextDate = dates.find(d => new Date(d).getTime() > now)
  if (!nextDate) return <span className="text-muted text-[9px]">{bank}: N/A</span>
  const diff = new Date(nextDate).getTime() - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const isUrgent = days < 14
  return (
    <span className="flex items-center gap-1">
      <span className="font-semibold">{bank}</span>
      <span className={`px-1 py-0.5 rounded-sm text-[8px] font-bold ${isUrgent ? 'bg-[var(--accent-red)] text-white' : 'bg-card border border-default'}`}>
        {days}d {hours}h
      </span>
    </span>
  )
}

function WorldMap({ countryRisk, selectedCountry, onSelect, geoDetections }: {
  countryRisk?: Record<string, number>
  selectedCountry: string | null
  onSelect: (c: string | null) => void
  geoDetections?: any[]
}) {
  const rows = [
    ['US', 'EU', 'CN', 'JP'],
    ['UK', 'RU', 'IN', 'BR'],
    ['AU', 'SA', 'KR', 'SG'],
  ]
  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold text-muted mb-1">COUNTRY RISK MAP</div>
      <svg viewBox="0 0 400 160" className="w-full max-w-[500px]">
        {rows.map((row, ri) => row.map((code, ci) => {
          const risk = countryRisk?.[code] ?? 0
          const r = risk > 0 ? Math.min(255, Math.round(risk * 2.55)) : 100
          const g = risk < 0 ? Math.min(255, Math.round(Math.abs(risk) * 2.55)) : 100
          const b = 100
          const isSelected = selectedCountry === code
          const x = 10 + ci * 100, y = 10 + ri * 50, w = 85, h = 38
          const events = geoDetections?.filter(d => d.matched?.toUpperCase().includes(code)) ?? []
          return (
            <g key={code} onClick={() => onSelect(isSelected ? null : code)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={w} height={h} rx={4}
                fill={isSelected ? 'var(--accent-blue)' : `rgb(${r},${g},${b})`}
                stroke={isSelected ? 'white' : 'var(--border-color)'}
                strokeWidth={isSelected ? 2 : 1} />
              <text x={x + w / 2} y={y + h / 2 + 1} textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize="10" fontWeight="bold">{code}</text>
              {events.length > 0 && (
                <circle cx={x + w - 8} cy={y + 8} r={4} fill="var(--accent-red)" />
              )}
            </g>
          )
        }))}
      </svg>
      {selectedCountry && (
        <div className="mt-1 text-[10px] text-accent-blue">Showing events for: {selectedCountry}</div>
      )}
    </div>
  )
}

function TariffSanctionsTimeline({ events }: { events?: any[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-muted mb-1">TARIFFS & SANCTIONS</div>
        <div className="text-[9px] text-muted">No tariff or sanction events detected</div>
      </div>
    )
  }
  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold text-muted mb-1">TARIFFS & SANCTIONS</div>
      <div className="space-y-2">
        {events.map((ev, i) => {
          const severityColor = ev.severity === 'Severe' ? 'var(--accent-red)' : ev.severity === 'High' ? '#f59e0b' : ev.severity === 'Medium' ? '#3b82f6' : '#6b7280'
          return (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full" style={{ background: severityColor }} />
                {i < events.length - 1 && <div className="w-px h-full min-h-[20px] bg-border-default" />}
              </div>
              <div className="bg-card border border-default rounded-sm px-2 py-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted">{ev.date}</span>
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm" style={{ background: severityColor + '20', color: severityColor }}>{ev.severity || 'Low'}</span>
                </div>
                <div className="text-[10px] text-primary font-semibold">{ev.title}</div>
                {ev.countries && <div className="text-[8px] text-muted">{ev.countries.join(', ')}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GeopoliticalAnalysis() {
  const [symbol, setSymbol] = useState('SPY')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const filteredDetections = useMemo(() => {
    if (!result?.geo_detections) return []
    if (!selectedCountry) return result.geo_detections
    return result.geo_detections.filter((d: any) => d.matched?.toUpperCase().includes(selectedCountry))
  }, [result?.geo_detections, selectedCountry])

  const analyze = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await api.post('/geo/analyze', { symbol, lookback_days: 7, region: 'global' })
      setResult(r.data)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 py-1 px-3 border-b border-default">
        <span className="font-bold text-[13px]">GEOPOLITICAL ANALYSIS</span>
        <span className="text-muted">|</span>
        <span className="text-[9px] text-muted">Real-time risk detection</span>
      </div>

      <div className="p-3 flex gap-2 items-center border-b border-default">
        <span className="text-[9px] text-muted">SYMBOL:</span>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-card border border-default text-primary px-2 py-1 text-[11px] font-mono-data w-[100px]" />
        <button onClick={analyze} disabled={loading}
          className="bg-[#3b82f6] border-0 text-white cursor-pointer py-1 px-3.5 text-[10px]" style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? 'ANALYZING...' : 'ANALYZE'}
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        {(['FOMC', 'ECB', 'BOJ', 'BOE'] as const).map(bank => (
          <CentralBankCountdown key={bank} bank={bank} />
        ))}
      </div>

      {error && <div className="p-3 text-down text-[10px]">{error}</div>}

      {result && (
        <div className="flex-1 overflow-auto p-3">
          <WorldMap countryRisk={(result as any).country_risk ?? (result as any).region_risk} selectedCountry={selectedCountry} onSelect={setSelectedCountry} geoDetections={result.geo_detections} />
          <div className="flex gap-3 mb-4">
            <div className="bg-card border border-default px-3.5 py-2.5 rounded min-w-[120px]">
              <div className="text-[9px] text-muted mb-0.5">SENTIMENT SCORE</div>
              <div className="text-[22px] font-bold" style={{ color: result.sentiment_score > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{result.sentiment_score?.toFixed(0)}</div>
              <div className="text-[12px] text-muted">Sentiment Score</div>
            </div>
            <div>
              <div className="text-[22px] font-bold" style={{ color: result.geo_count > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>{result.geo_count}</div>
              <div className="text-[12px] text-muted">Geo Events</div>
            </div>
            <div>
              <div className="text-[22px] font-bold" style={{ color: result.geo_penalty < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{result.geo_penalty}</div>
            </div>
          </div>

          {result.alerts?.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-muted mb-1">ALERTS</div>
              {result.alerts.map((a: string, i: number) => (
                <div key={i} className="bg-card border border-default px-2.5 py-1.5 rounded-sm mb-1 text-[10px]">{a}</div>
              ))}
            </div>
          )}

          {result.trend_outlook && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-muted mb-1">TREND OUTLOOK</div>
              <div className="flex gap-2">
                {Object.entries(result.trend_outlook).map(([k, v]: [string, any]) => (
                  <div key={k} className="bg-card border border-default px-3 py-2 rounded flex-1">
                    <div className="text-[9px] text-muted mb-0.5">{k.toUpperCase()}</div>
                    <div className="text-sm font-bold" style={{ color: v.trend === 'BUY' ? 'var(--accent-green)' : v.trend === 'SELL' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{v.trend}</div>
                    <div className="text-[9px] text-muted">{v.strength} ({v.score?.toFixed(0)})</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.indicators && (
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-muted mb-1">INDICATORS</div>
              <div className="flex gap-2">
                {Object.entries(result.indicators).map(([k, v]: [string, any]) => (
                  <div key={k} className="bg-card border border-default px-2.5 py-1.5 rounded">
                    <div className="text-[9px] text-muted">{k}</div>
                    <div className="text-xs font-semibold">{typeof v === 'number' ? v.toFixed(2) : v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredDetections.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted mb-1">DETECTED EVENTS ({filteredDetections.length})</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-muted text-[9px] text-left border-b border-default">
                    <th className="px-2 py-1">Level</th>
                    <th className="px-2 py-1">Match</th>
                    <th className="px-2 py-1">Title</th>
                    <th className="px-2 py-1">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetections.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-[rgba(26,35,50,0.3)]">
                      <td className="px-2 py-[3px]">
                        <span className="font-semibold" style={{ color: d.level === 'severe' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{d.level.toUpperCase()}</span>
                      </td>
                      <td className="px-2 py-[3px] text-accent-blue">{d.matched}</td>
                      <td className="px-2 py-[3px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">{d.title}</td>
                      <td className="px-2 py-[3px] text-down">{d.penalty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TariffSanctionsTimeline events={(result as any).events} />
        </div>
      )}

      {!result && !loading && !error && (
        <div className="flex-1 flex items-center justify-center text-muted text-[10px]">
          Enter a symbol and click ANALYZE to detect geopolitical risks
        </div>
      )}
    </div>
  )
}
