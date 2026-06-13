import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import {
  placeGTT, modifyGTT, cancelGTT, fetchGTTOrderbook,
  type GTTTrigger, type GTTPlaceRequest,
} from '../api/openalgo'
import { Bell, Plus, X, RefreshCw, Check, AlertTriangle } from 'lucide-react'

type FormMode = 'place' | 'modify' | null

const emptyForm: GTTPlaceRequest = {
  strategy: '',
  trigger_type: 'SINGLE',
  exchange: 'NSE',
  symbol: '',
  action: 'BUY',
  product: 'CNC',
  quantity: 1,
  pricetype: 'LIMIT',
  price: 0,
  triggerprice_sl: 0,
  triggerprice_tg: 0,
  stoploss: 0,
  target: 0,
}

export default function GTTOrders() {
  const [triggers, setTriggers] = useState<GTTTrigger[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [form, setForm] = useState<GTTPlaceRequest>(emptyForm)
  const [modifyId, setModifyId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    fetchGTTOrderbook()
      .then((res) => setTriggers(res.data || []))
      .catch((err) => addToast(`Failed to load GTT triggers: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const resetForm = () => {
    setForm(emptyForm)
    setModifyId('')
    setFormMode(null)
  }

  const openPlace = () => {
    resetForm()
    setFormMode('place')
  }

  const openModify = (t: GTTTrigger) => {
    setForm({
      strategy: t.strategy,
      trigger_type: t.trigger_type as 'SINGLE' | 'OCO',
      exchange: t.exchange,
      symbol: t.symbol,
      action: t.action as 'BUY' | 'SELL',
      product: t.product as 'CNC' | 'NRML',
      quantity: t.quantity,
      pricetype: t.pricetype as 'LIMIT' | 'MARKET',
      price: t.price,
      triggerprice_sl: t.triggerprice_sl,
      triggerprice_tg: t.triggerprice_tg,
      stoploss: t.stoploss ?? 0,
      target: t.target ?? 0,
    })
    setModifyId(t.gtt_id)
    setFormMode('modify')
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (formMode === 'place') {
        await placeGTT(form)
        addToast('GTT placed successfully', 'success')
      } else if (formMode === 'modify') {
        await modifyGTT({ ...form, trigger_id: modifyId })
        addToast('GTT modified successfully', 'success')
      }
      resetForm()
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelGTT(id)
      addToast('GTT cancelled', 'success')
      load()
    } catch (err: any) {
      addToast(`Cancel failed: ${err?.message}`, 'error')
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'success'
      case 'triggered': return 'info'
      case 'cancelled': return 'error'
      case 'expired': return 'warning'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={200} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Bell size={12} className="inline mr-1" /> GTT Orders
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant="primary" size="sm" onClick={openPlace}><Plus size={12} /> New GTT</Button>
        </div>
      </div>

      {formMode && (
        <Card title={formMode === 'place' ? 'Place GTT Order' : 'Modify GTT Order'}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Strategy" value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} />
              <Select label="Trigger Type" options={[{ value: 'SINGLE', label: 'SINGLE' }, { value: 'OCO', label: 'OCO' }]}
                value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value as 'SINGLE' | 'OCO' })} />
              <Select label="Exchange" options={[{ value: 'NSE', label: 'NSE' }, { value: 'BSE', label: 'BSE' }, { value: 'NFO', label: 'NFO' }]}
                value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })} />
              <Input label="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
              <Select label="Action" options={[{ value: 'BUY', label: 'BUY' }, { value: 'SELL', label: 'SELL' }]}
                value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as 'BUY' | 'SELL' })} />
              <Select label="Product" options={[{ value: 'CNC', label: 'CNC' }, { value: 'NRML', label: 'NRML' }]}
                value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value as 'CNC' | 'NRML' })} />
              <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              <Select label="Price Type" options={[{ value: 'LIMIT', label: 'LIMIT' }, { value: 'MARKET', label: 'MARKET' }]}
                value={form.pricetype} onChange={(e) => setForm({ ...form, pricetype: e.target.value as 'LIMIT' | 'MARKET' })} />
              <Input label="Price" type="number" step="0.05" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              <Input label="Trigger Price (SL)" type="number" step="0.05" value={form.triggerprice_sl || ''}
                onChange={(e) => setForm({ ...form, triggerprice_sl: Number(e.target.value) })} />
              <Input label="Trigger Price (TG)" type="number" step="0.05" value={form.triggerprice_tg || ''}
                onChange={(e) => setForm({ ...form, triggerprice_tg: Number(e.target.value) })} />
              {form.trigger_type === 'OCO' && (
                <>
                  <Input label="Stoploss Limit" type="number" step="0.05" value={form.stoploss || ''}
                    onChange={(e) => setForm({ ...form, stoploss: Number(e.target.value) })} />
                  <Input label="Target Limit" type="number" step="0.05" value={form.target || ''}
                    onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} />
                </>
              )}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={resetForm}><X size={12} /> Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting}>
                <Check size={12} /> {formMode === 'place' ? 'Place' : 'Modify'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card title={`Active Triggers (${triggers.length})`}>
        {triggers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <AlertTriangle size={24} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No GTT triggers found</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {triggers.map((t) => (
              <div key={t.gtt_id} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {t.symbol} <span style={{ color: 'var(--text-muted)' }}>{t.exchange}</span>
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {t.action} {t.quantity} @ {t.price} | Trigger: {t.trigger_price}
                    </span>
                  </div>
                  <Badge label={t.trigger_type} variant="info" />
                  <Badge label={t.status} variant={statusColor(t.status) as any} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>{t.gtt_id.slice(0, 12)}</span>
                  {t.status === 'active' && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openModify(t)}><Bell size={10} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(t.gtt_id)}><X size={10} /></Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
