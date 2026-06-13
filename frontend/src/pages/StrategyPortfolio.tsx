import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import {
  listStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  type StrategyEntry,
  type StrategyLeg,
} from '../api/strategyPortfolio'
import { Plus, Trash2, Edit3, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

type Tab = 'mytrades' | 'simulation'

const emptyLeg: StrategyLeg = { type: 'call', action: 'buy', strike: 0, quantity: 50, price: 0 }

function emptyForm() {
  return {
    name: '',
    watchlist: 'mytrades' as Tab,
    underlying: '',
    exchange: 'NSE',
    expiry: '',
    legs: [{ ...emptyLeg }],
    notes: '',
  }
}

function StrategyForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<StrategyEntry>
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<any>(
    initial
      ? { ...initial, legs: initial.legs?.map((l) => ({ ...l })) ?? [{ ...emptyLeg }] }
      : emptyForm(),
  )
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const updateField = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }))

  const updateLeg = (idx: number, field: string, value: any) => {
    const legs = form.legs.map((l: any, i: number) => (i === idx ? { ...l, [field]: value } : l))
    setForm((f: any) => ({ ...f, legs }))
  }

  const addLeg = () => setForm((f: any) => ({ ...f, legs: [...f.legs, { ...emptyLeg }] }))
  const removeLeg = (idx: number) => setForm((f: any) => ({ ...f, legs: f.legs.filter((_: any, i: number) => i !== idx) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.underlying) {
      addToast('Name and underlying are required', 'error')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      addToast('Strategy saved', 'success')
    } catch (err: any) {
      addToast(`Failed to save: ${err?.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Name" value={form.name} onChange={(v) => updateField('name', v)} required />
        <Input label="Underlying" value={form.underlying} onChange={(v) => updateField('underlying', v)} required />
        <Input label="Exchange" value={form.exchange} onChange={(v) => updateField('exchange', v)} required />
        <Input label="Expiry" value={form.expiry} onChange={(v) => updateField('expiry', v)} placeholder="YYYY-MM-DD" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Watchlist</label>
        <select
          className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800"
          value={form.watchlist}
          onChange={(e) => updateField('watchlist', e.target.value)}
        >
          <option value="mytrades">My Trades</option>
          <option value="simulation">Simulation</option>
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Legs</label>
          <Button type="button" variant="ghost" size="sm" onClick={addLeg}>
            <Plus className="w-4 h-4 mr-1" /> Add Leg
          </Button>
        </div>
        {form.legs.map((leg: any, idx: number) => (
          <div key={idx} className="flex gap-2 items-end mb-2 p-2 border rounded">
            <select
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
              value={leg.type}
              onChange={(e) => updateLeg(idx, 'type', e.target.value)}
            >
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
            <select
              className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
              value={leg.action}
              onChange={(e) => updateLeg(idx, 'action', e.target.value)}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <Input
              type="number"
              placeholder="Strike"
              value={leg.strike}
              onChange={(v) => updateLeg(idx, 'strike', Number(v))}
              className="w-24 text-sm"
            />
            <Input
              type="number"
              placeholder="Qty"
              value={leg.quantity}
              onChange={(v) => updateLeg(idx, 'quantity', Number(v))}
              className="w-20 text-sm"
            />
            <Input
              type="number"
              placeholder="Price"
              value={leg.price}
              onChange={(v) => updateLeg(idx, 'price', Number(v))}
              className="w-24 text-sm"
            />
            {form.legs.length > 1 && (
              <Button type="button" variant="danger" size="sm" onClick={() => removeLeg(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-sm"
          rows={3}
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </form>
  )
}

function LegSummary({ legs }: { legs: StrategyLeg[] }) {
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      {legs.map((l, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {l.action} {l.quantity}x {l.type} {l.strike}@{l.price}
        </span>
      ))}
    </div>
  )
}

export default function StrategyPortfolio() {
  const [tab, setTab] = useState<Tab>('mytrades')
  const [strategies, setStrategies] = useState<StrategyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StrategyEntry | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    listStrategies(tab)
      .then(setStrategies)
      .catch((err) => addToast(`Failed to load strategies: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [tab])

  const handleSave = async (data: any) => {
    if (editing) {
      await updateStrategy(editing.id, data)
    } else {
      await createStrategy(data)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this strategy?')) return
    try {
      await deleteStrategy(id)
      addToast('Strategy deleted', 'success')
      load()
    } catch (err: any) {
      addToast(`Failed to delete: ${err?.message}`, 'error')
    }
  }

  const openEdit = (s: StrategyEntry) => {
    setEditing(s)
    setShowForm(true)
  }

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Strategy Portfolio</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Create New
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'mytrades' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('mytrades')}
        >
          My Trades
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'simulation' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('simulation')}
        >
          Simulation
        </button>
      </div>

      {showForm && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Strategy' : 'New Strategy'}</h2>
          <StrategyForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton height={16} width="60%" />
              <Skeleton height={12} width="40%" />
              <Skeleton height={12} width="80%" />
            </Card>
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No strategies found. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-gray-500">
                    {s.underlying} · {s.exchange}
                    {s.expiry && ` · Exp: ${s.expiry}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1 hover:text-blue-500">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge label={`${s.legs.length} leg${s.legs.length !== 1 ? 's' : ''}`} variant="info" />
                <Badge label={s.watchlist} variant="default" />
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Created: {new Date(s.created_at).toLocaleDateString()}
                {s.updated_at !== s.created_at && ` · Updated: ${new Date(s.updated_at).toLocaleDateString()}`}
              </div>
              <button
                className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:underline"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                {expandedId === s.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expandedId === s.id ? 'Hide Details' : 'Show Details'}
              </button>
              {expandedId === s.id && (
                <div className="mt-2 pt-2 border-t space-y-2">
                  <LegSummary legs={s.legs} />
                  {s.notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {s.notes}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
