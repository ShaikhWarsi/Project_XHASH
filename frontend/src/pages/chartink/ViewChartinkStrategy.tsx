import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Skeleton from '../../components/Skeleton'
import { useToastStore } from '../../store/toast'
import { fetchChartinkStrategy, updateChartinkStrategy } from '../../api/chartink'
import type { ChartinkStrategy } from '../../types/chartink'
import { Save, ArrowLeft, Settings } from 'lucide-react'

const EXCHANGES = ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX']
const ACTIONS = ['BUY', 'SELL']
const PRODUCTS = ['MIS', 'CNC', 'NRML']
const PRICETYPES = ['MARKET', 'LIMIT', 'SL', 'SL-M']

export default function ViewChartinkStrategy() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const [strategy, setStrategy] = useState<ChartinkStrategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState('NSE')
  const [action, setAction] = useState('BUY')
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState('MIS')
  const [pricetype, setPricetype] = useState('MARKET')
  const [intraday, setIntraday] = useState(true)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchChartinkStrategy(id)
      .then((s) => {
        setStrategy(s)
        setName(s.name)
        setSymbol(s.symbol)
        setExchange(s.exchange)
        setAction(s.action)
        setQuantity(s.quantity)
        setProduct(s.product)
        setPricetype(s.pricetype)
        setIntraday(s.intraday)
        setEnabled(s.enabled)
      })
      .catch((err) => addToast(`Failed: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [id, addToast])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await updateChartinkStrategy(id, {
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        exchange,
        action,
        quantity,
        product,
        pricetype,
        intraday,
        enabled,
      })
      addToast('Strategy updated', 'success')
    } catch (err: any) {
      addToast(`Save failed: ${err?.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={300} variant="rect" />
      </div>
    )
  }

  if (!strategy) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Strategy not found</span>
        <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/chartink')}><ArrowLeft size={12} /> Back</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Settings size={12} className="inline mr-1" /> Edit ChartInk Strategy
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/chartink')}><ArrowLeft size={12} /> Back</Button>
      </div>

      <Card title={strategy.name}>
        <div className="flex flex-col gap-3">
          <Input label="Strategy Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Exchange" options={EXCHANGES.map((e) => ({ value: e, label: e }))} value={exchange} onChange={(e) => setExchange(e.target.value)} />
            <Select label="Action" options={ACTIONS.map((a) => ({ value: a, label: a }))} value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1} />
            <Select label="Product" options={PRODUCTS.map((p) => ({ value: p, label: p }))} value={product} onChange={(e) => setProduct(e.target.value)} />
            <Select label="Price Type" options={PRICETYPES.map((p) => ({ value: p, label: p }))} value={pricetype} onChange={(e) => setPricetype(e.target.value)} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={intraday} onChange={(e) => setIntraday(e.target.checked)} style={{ accentColor: 'var(--accent-cyan)' }} />
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-primary)' }}>Intraday</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={{ accentColor: 'var(--accent-cyan)' }} />
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-primary)' }}>Enabled</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
              <Save size={12} /> Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
