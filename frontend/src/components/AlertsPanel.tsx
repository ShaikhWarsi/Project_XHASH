import { useEffect, useState } from 'react'
import { Bell, Trash2, Plus } from 'lucide-react'
import { getAlerts, createAlert, deleteAlert, fetchQuote } from '../api/client'
import type { Alert } from '../api/types'
import Card from './ui/Card'

export default function AlertsPanel({ symbol: defaultSymbol }: { symbol?: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newSymbol, setNewSymbol] = useState(defaultSymbol || '')
  const [targetPrice, setTargetPrice] = useState('')
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [quoteError, setQuoteError] = useState(false)

  const loadAlerts = async () => {
    try {
      const data = await getAlerts()
      setAlerts(data)
    } catch (err) {
      console.error('Failed to load alerts:', err)
    }
  }

  useEffect(() => { loadAlerts() }, [])

  useEffect(() => {
    if (defaultSymbol) {
      setNewSymbol(defaultSymbol)
      setQuoteError(false)
      fetchQuote(defaultSymbol).then(q => setCurrentPrice(q.c)).catch(() => setQuoteError(true))
    }
  }, [defaultSymbol])

  const handleCreate = async () => {
    if (!newSymbol || !targetPrice) return
    try {
      await createAlert(newSymbol.toUpperCase(), parseFloat(targetPrice), condition)
      setShowCreate(false)
      setTargetPrice('')
      loadAlerts()
    } catch (err) {
      console.error('Failed to create alert:', err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteAlert(id)
      loadAlerts()
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          <Bell className="w-4 h-4" style={{ color: 'var(--accent-yellow)' }} />
          Price Alerts
        </h3>
        <button
          onClick={() => setShowCreate(v => !v)}
          aria-label={showCreate ? 'Cancel new alert' : 'Create new alert'}
          className="flex items-center gap-1 cursor-pointer" style={{ fontSize: 10, color: 'var(--accent-blue)' }}
        >
          <Plus className="w-3 h-3" /> New Alert
        </button>
      </div>

      {showCreate && (
        <div className="mb-3 p-3 rounded-lg space-y-2" style={{ background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)', border: '1px solid var(--border-color)' }}>
          <div className="flex gap-2">
            <input
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="SYMBOL"
              className="uppercase" style={{ width: 80, background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 3, padding: '4px 8px', fontSize: 10, color: 'var(--text-primary)' }}
            />
            <input
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder={currentPrice ? `$${currentPrice}` : quoteError ? 'Price unavailable' : 'Price'}
              type="number"
              step="0.01"
              className="flex-1" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 3, padding: '4px 8px', fontSize: 10, color: 'var(--text-primary)' }}
            />
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as 'ABOVE' | 'BELOW')}
              style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 3, padding: '4px 8px', fontSize: 10, color: 'var(--text-primary)' }}
            >
              <option value="ABOVE">Above</option>
              <option value="BELOW">Below</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="cursor-pointer" style={{ fontSize: 10, color: 'var(--text-secondary)', padding: '2px 8px', background: 'none', border: 'none' }}>Cancel</button>
            <button onClick={handleCreate} aria-label="Create alert" className="cursor-pointer" style={{ fontSize: 10, background: 'var(--accent-blue)', color: '#fff', padding: '4px 12px', borderRadius: 3, border: 'none' }}>Create</button>
          </div>
        </div>
      )}

      <div className="space-y-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
        {alerts.length === 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No active alerts. Create one above.</div>
        )}
        {alerts.map(a => (
          <div key={a.id} className="flex items-center justify-between p-2 rounded-lg group" style={{ background: 'color-mix(in srgb, var(--bg-card) 70%, transparent)', border: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{a.symbol}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                {a.condition === 'ABOVE' ? '>' : '<'} ${a.targetPrice.toFixed(2)}
                {!a.active && <span style={{ color: 'var(--accent-yellow)' }} className="ml-2">(inactive)</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(a.id)} aria-label={`Delete alert for ${a.symbol}`} className="opacity-0 group-hover:opacity-100 p-1 transition-all cursor-pointer" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
    </div>
    </Card>
  )
}