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
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9aa0a6] flex items-center gap-2">
          <Bell className="w-4 h-4 text-yellow-500" />
          Price Alerts
        </h3>
        <button
          onClick={() => setShowCreate(v => !v)}
          aria-label={showCreate ? 'Cancel new alert' : 'Create new alert'}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New Alert
        </button>
      </div>

      {showCreate && (
        <div className="mb-3 p-3 rounded-lg bg-[#2a2d3e]/50 border border-[#3a3d4e] space-y-2">
          <div className="flex gap-2">
            <input
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="SYMBOL"
              className="w-24 bg-[#1e2235] border border-[#3a3d4e] rounded px-2 py-1.5 text-xs text-white uppercase"
            />
            <input
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder={currentPrice ? `$${currentPrice}` : quoteError ? 'Price unavailable' : 'Price'}
              type="number"
              step="0.01"
              className="flex-1 bg-[#1e2235] border border-[#3a3d4e] rounded px-2 py-1.5 text-xs text-white"
            />
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as 'ABOVE' | 'BELOW')}
              className="bg-[#1e2235] border border-[#3a3d4e] rounded px-2 py-1.5 text-xs text-white"
            >
              <option value="ABOVE">Above</option>
              <option value="BELOW">Below</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="text-xs text-[#9aa0a6] px-2 py-1">Cancel</button>
            <button onClick={handleCreate} aria-label="Create alert" className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Create</button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {alerts.length === 0 && (
          <div className="text-xs text-[#5f6368] text-center py-4">No active alerts. Create one above.</div>
        )}
        {alerts.map(a => (
          <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[#2a2d3e]/30 border border-[#3a3d4e]/50 group">
            <div>
              <div className="text-sm font-medium text-white">{a.symbol}</div>
              <div className="text-xs text-[#9aa0a6]">
                {a.condition === 'ABOVE' ? '>' : '<'} ${a.targetPrice.toFixed(2)}
                {!a.active && <span className="text-yellow-500 ml-2">(inactive)</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(a.id)} aria-label={`Delete alert for ${a.symbol}`} className="opacity-0 group-hover:opacity-100 p-1 text-[#9aa0a6] hover:text-red-400 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}