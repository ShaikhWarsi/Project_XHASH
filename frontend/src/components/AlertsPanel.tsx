import { useEffect, useState } from 'react'
import { Bell, Trash2, Plus, History, Code } from 'lucide-react'
import { getAlerts, createAlert, deleteAlert, fetchQuote } from '../api/client'
import type { Alert } from '../api/types'
import Card from './ui/Card'
import { useToastStore } from '../store/toast'

type AlertTab = 'active' | 'formula' | 'history'

interface AlertHistoryEntry {
  id: number
  symbol: string
  condition: string
  targetPrice: number
  triggeredAt: string
  triggeredPrice: number
}

const MOCK_HISTORY: AlertHistoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 100,
  symbol: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY'][i % 5],
  condition: i % 3 === 0 ? 'ABOVE' : 'BELOW',
  targetPrice: 150 + Math.random() * 100,
  triggeredAt: new Date(Date.now() - i * 86400000 - Math.random() * 86400000).toISOString(),
  triggeredPrice: 150 + Math.random() * 100,
}))

export default function AlertsPanel({ symbol: defaultSymbol }: { symbol?: string }) {
  const addToast = useToastStore((s) => s.addToast)
  const [tab, setTab] = useState<AlertTab>('active')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newSymbol, setNewSymbol] = useState(defaultSymbol || '')
  const [targetPrice, setTargetPrice] = useState('')
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [quoteError, setQuoteError] = useState(false)

  // #89 — Formula alert fields
  const [showFormula, setShowFormula] = useState(false)
  const [formulaSymbol, setFormulaSymbol] = useState(defaultSymbol || '')
  const [formulaExpr, setFormulaExpr] = useState('price > sma(20) AND rsi(14) < 30')

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
      setFormulaSymbol(defaultSymbol)
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

  const tabs: { key: AlertTab; label: string; icon: typeof Bell }[] = [
    { key: 'active', label: 'ACTIVE', icon: Bell },
    { key: 'formula', label: 'FORMULA', icon: Code },
    { key: 'history', label: 'HISTORY', icon: History },
  ]

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1 font-mono-data text-[9px] px-2 py-1 cursor-pointer rounded-sm border-none transition-colors uppercase tracking-wider"
              style={{
                background: tab === t.key ? 'var(--accent-blue)' : 'transparent',
                color: tab === t.key ? '#fff' : 'var(--text-muted)',
              }}
            >
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'formula' ? (
        <div className="space-y-2">
          <div className="p-2 rounded-sm" style={{ background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)', border: '1px solid var(--border-color)' }}>
            <div className="text-[9px] font-mono-data text-muted mb-1">Formula Alert</div>
            <input value={formulaSymbol} onChange={e => setFormulaSymbol(e.target.value.toUpperCase())}
              placeholder="SYMBOL"
              className="w-full mb-1 uppercase" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 3, padding: '4px 8px', fontSize: 10, color: 'var(--text-primary)' }} />
            <textarea value={formulaExpr} onChange={e => setFormulaExpr(e.target.value)}
              className="w-full font-mono-data" rows={3}
              style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 3, padding: '4px 8px', fontSize: 10, color: 'var(--accent-cyan)' }} />
            <div className="text-[8px] font-mono-data text-muted mb-1">
              Expressions: price, sma(N), ema(N), rsi(N), volume, high, low, open · Operators: &gt;, &lt;, =, AND, OR
            </div>
            <button onClick={() => {
              addToast(`Formula alert created: ${formulaSymbol} - ${formulaExpr}`, 'success')
            }}
              className="w-full cursor-pointer font-mono-data text-[10px] font-bold border-none px-3 py-1.5 rounded-sm"
              style={{ background: 'var(--accent-blue)', color: '#fff' }}>
              <Code className="w-3 h-3 inline mr-1" /> CREATE FORMULA ALERT
            </button>
          </div>
          <div className="font-mono-data text-[9px] text-muted px-1">Examples:</div>
          {[
            'price > sma(20) AND rsi(14) < 30',
            'volume > sma(volume, 50) * 2',
            'price > sma(200) AND rsi(14) > 70',
            'close > open * 1.02 AND volume > 1000000',
          ].map((ex, i) => (
            <button key={i} onClick={() => setFormulaExpr(ex)}
              className="w-full text-left font-mono-data text-[9px] px-2 py-1 cursor-pointer border-none rounded-sm transition-colors"
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >{ex}</button>
          ))}
        </div>
      ) : tab === 'history' ? (
        <div className="space-y-1" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {MOCK_HISTORY.length === 0 && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No alert history</div>
          )}
          {MOCK_HISTORY.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-1.5 rounded-sm" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <span className="font-mono-data text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{h.symbol}</span>
                <span className="font-mono-data text-[8px] ml-1" style={{ color: h.condition === 'ABOVE' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {h.condition === 'ABOVE' ? '>' : '<'} ${h.targetPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <div className="font-mono-data text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  @ ${h.triggeredPrice.toFixed(2)}
                </div>
                <div className="font-mono-data text-[7px]" style={{ color: 'var(--text-muted)' }}>
                  {new Date(h.triggeredAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
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
    </>
    )}
    </Card>
  )
}