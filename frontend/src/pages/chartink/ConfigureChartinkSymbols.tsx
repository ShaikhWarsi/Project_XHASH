import { useEffect, useState, useCallback, useRef } from 'react'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Skeleton from '../../components/Skeleton'
import { useToastStore } from '../../store/toast'
import { fetchChartinkSymbolMappings, createChartinkSymbolMapping, deleteChartinkSymbolMapping } from '../../api/chartink'
import type { ChartinkSymbolMapping } from '../../types/chartink'
import { Plus, Trash2, RefreshCw, Upload, ArrowLeft, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const EXCHANGES = ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX']

export default function ConfigureChartinkSymbols() {
  const [mappings, setMappings] = useState<ChartinkSymbolMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [chartinkSymbol, setChartinkSymbol] = useState('')
  const [tradingSymbol, setTradingSymbol] = useState('')
  const [exchange, setExchange] = useState('NSE')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    fetchChartinkSymbolMappings()
      .then(setMappings)
      .catch((err) => addToast(`Failed: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!chartinkSymbol.trim() || !tradingSymbol.trim()) {
      addToast('Both symbol fields are required', 'error')
      return
    }
    setSubmitting(true)
    try {
      await createChartinkSymbolMapping({
        chartink_symbol: chartinkSymbol.trim().toUpperCase(),
        trading_symbol: tradingSymbol.trim().toUpperCase(),
        exchange,
      })
      addToast('Symbol mapping added', 'success')
      setChartinkSymbol('')
      setTradingSymbol('')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteChartinkSymbolMapping(id)
      addToast('Mapping removed', 'success')
      load()
    } catch (err: any) {
      addToast(`Delete failed: ${err?.message}`, 'error')
    }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').filter(Boolean)
    let added = 0
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim())
      if (parts.length >= 2) {
        try {
          await createChartinkSymbolMapping({
            chartink_symbol: parts[0].toUpperCase(),
            trading_symbol: parts[1].toUpperCase(),
            exchange: parts[2]?.toUpperCase() || 'NSE',
          })
          added++
        } catch { }
      }
    }
    addToast(`Added ${added} mappings from CSV`, 'success')
    load()
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={250} height={16} />
        {[1, 2, 3].map((i) => <Skeleton key={i} height={40} variant="rect" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Settings size={12} className="inline mr-1" /> ChartInk Symbol Mappings
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/chartink')}><ArrowLeft size={12} /> Back</Button>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
        </div>
      </div>

      <Card title="Add Mapping">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <Input label="ChartInk Symbol" value={chartinkSymbol} onChange={(e) => setChartinkSymbol(e.target.value)} placeholder="SBIN" />
            <Input label="Trading Symbol" value={tradingSymbol} onChange={(e) => setTradingSymbol(e.target.value)} placeholder="SBIN-EQ" />
            <Select label="Exchange" options={EXCHANGES.map((e) => ({ value: e, label: e }))} value={exchange} onChange={(e) => setExchange(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} loading={submitting}><Plus size={12} /> Add</Button>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvUpload} hidden />
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><Upload size={12} /> Upload CSV</Button>
          </div>
        </div>
      </Card>

      <Card title="Existing Mappings">
        {mappings.length === 0 ? (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No mappings configured</span>
        ) : (
          <div className="flex flex-col gap-1">
            {mappings.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1 px-2 rounded-sm" style={{ background: 'var(--bg-primary)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{m.chartink_symbol}</span>
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>→</span>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--accent-cyan)' }}>{m.trading_symbol}</span>
                  <Badge label={m.exchange} variant="info" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}><Trash2 size={10} /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
