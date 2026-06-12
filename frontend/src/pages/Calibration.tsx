import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import KpiCard from '../components/ui/KpiCard'

export default function Calibration() {
  const [thresholds, setThresholds] = useState<any>(null)
  const [weights, setWeights] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [t, w] = await Promise.all([
        api.get('/calibration/thresholds'),
        api.get('/calibration/weights'),
      ])
      setThresholds(t.data)
      setWeights(w.data)
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || err.message || 'Failed to load')
    }
    setLoading(false)
  }

  const calibrate = async () => {
    setLoading(true)
    try {
      const r = await api.post('/calibration/calibrate')
      setThresholds(r.data.thresholds)
      setWeights(r.data.analyst_weights)
      setMessage(`Calibrated at ${new Date().toLocaleTimeString()}`)
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    }
    setLoading(false)
  }

  const recordTestTrade = async () => {
    const signal = prompt('Signal (BUY/SELL/HOLD):', 'BUY')
    if (!signal) return
    const confidence = prompt('Confidence (0-1):', '0.7')
    if (!confidence) return
    const pnl = prompt('PnL % (e.g. 0.05 for 5%):', '0.05')
    if (!pnl) return
    try {
      await api.post(`/calibration/record?signal=${signal}&confidence=${confidence}&pnl_pct=${pnl}`)
      setMessage('Trade recorded')
      load()
    } catch (e: any) {
      setMessage(`Error: ${e.message}`)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">AI CALIBRATION</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
        <button onClick={calibrate} disabled={loading} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer disabled:opacity-50">
          RUN CALIBRATION
        </button>
        <button onClick={recordTestTrade} className="bg-card border border-default px-3 py-1 text-[11px] rounded cursor-pointer">
          RECORD TRADE
        </button>
        <button onClick={load} className="bg-card border border-default px-3 py-1 text-[11px] rounded cursor-pointer">REFRESH</button>
      </div>
      {message && <div className="px-3 py-1 text-[10px] text-accent-blue border-b border-default">{message}</div>}
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Calibrating..." /></div>}
      {thresholds && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <KpiCard label="OPTIMAL THRESHOLD" value={thresholds.optimal_confidence_threshold} />
            <KpiCard label="ACCURACY" value={`${((thresholds.overall_accuracy || 0) * 100).toFixed(1)}%`} />
            <KpiCard label="SAMPLES" value={thresholds.total_samples} />
            <KpiCard label="CORRECT" value={thresholds.correct_trades} />
          </div>
          {weights && Object.keys(weights).length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted mb-1">ANALYST WEIGHTS</div>
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(weights).map(([name, weight]: [string, any]) => (
                  <div key={name} className="bg-card border border-default p-2 rounded text-[10px]">
                    <span className="text-accent-blue">{name}</span>: {(weight * 100).toFixed(1)}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
