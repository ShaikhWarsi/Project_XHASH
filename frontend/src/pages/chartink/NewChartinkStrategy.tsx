import { useState } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { useToastStore } from '../../store/toast'
import { createChartinkStrategy } from '../../api/chartink'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Settings } from 'lucide-react'

const EXCHANGES = ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX']
const ACTIONS = ['BUY', 'SELL']
const PRODUCTS = ['MIS', 'CNC', 'NRML']
const PRICETYPES = ['MARKET', 'LIMIT', 'SL', 'SL-M']

export default function NewChartinkStrategy() {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState('NSE')
  const [action, setAction] = useState('BUY')
  const [quantity, setQuantity] = useState(1)
  const [product, setProduct] = useState('MIS')
  const [pricetype, setPricetype] = useState('MARKET')
  const [intraday, setIntraday] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!name.trim()) { addToast('Strategy name is required', 'error'); return }
    if (!symbol.trim()) { addToast('Symbol is required', 'error'); return }
    setSubmitting(true)
    try {
      const result = await createChartinkStrategy({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        exchange,
        action,
        quantity,
        product,
        pricetype,
        intraday,
      })
      addToast('Strategy created', 'success')
      navigate(`/openalgo/chartink/view/${result.id}`)
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Settings size={12} className="inline mr-1" /> New ChartInk Strategy
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/chartink')}><ArrowLeft size={12} /> Back</Button>
      </div>

      <Card title="Strategy Configuration">
        <div className="flex flex-col gap-3">
          <Input label="Strategy Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My EMA Crossover" />
          <Input label="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="SBIN" />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Exchange" options={EXCHANGES.map((e) => ({ value: e, label: e }))} value={exchange} onChange={(e) => setExchange(e.target.value)} />
            <Select label="Action" options={ACTIONS.map((a) => ({ value: a, label: a }))} value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1} />
            <Select label="Product" options={PRODUCTS.map((p) => ({ value: p, label: p }))} value={product} onChange={(e) => setProduct(e.target.value)} />
            <Select label="Price Type" options={PRICETYPES.map((p) => ({ value: p, label: p }))} value={pricetype} onChange={(e) => setPricetype(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={intraday} onChange={(e) => setIntraday(e.target.checked)} style={{ accentColor: 'var(--accent-cyan)' }} />
            <span className="text-[9px] font-mono" style={{ color: 'var(--text-primary)' }}>Intraday</span>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting}>
              <Plus size={12} /> Create Strategy
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
