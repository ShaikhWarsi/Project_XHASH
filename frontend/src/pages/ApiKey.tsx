import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/Skeleton'
import DataTable from '../components/ui/DataTable'
import { useToastStore } from '../store/toast'
import { fetchApiKeys, generateApiKey, revokeApiKey, toggleOrderMode, type ApiKey } from '../api/openalgo'
import { Key, Plus, RefreshCw, XCircle, ToggleLeft, ToggleRight } from 'lucide-react'

export default function ApiKeyPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)
  const [mode, setMode] = useState<'live' | 'paper'>('paper')
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    fetchApiKeys()
      .then((k) => { setKeys(k) })
      .catch((err) => addToast(`Failed to load API keys: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleGenerate = async () => {
    if (!newLabel.trim()) return
    try {
      const result = await generateApiKey(newLabel.trim(), ['trade', 'read'])
      setNewKeyResult(result.key_preview)
      addToast('API key generated', 'success')
      setNewLabel('')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id)
      addToast('Key revoked', 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleToggleMode = async () => {
    const newMode = mode === 'live' ? 'paper' : 'live'
    try {
      await toggleOrderMode(newMode)
      setMode(newMode)
      addToast(`Order mode switched to ${newMode}`, 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const columns = [
    { key: 'label', label: 'Label', render: (k: ApiKey) => k.label, sortable: true, sortValue: (k: ApiKey) => k.label },
    { key: 'key', label: 'Key', render: (k: ApiKey) => <span className="font-mono text-[10px]">{k.key_preview}...</span> },
    { key: 'status', label: 'Status', render: (k: ApiKey) => <Badge label={k.is_active ? 'Active' : 'Revoked'} variant={k.is_active ? 'success' : 'error'} /> },
    { key: 'mode', label: 'Mode', render: (k: ApiKey) => <Badge label={k.order_mode} variant={k.order_mode === 'live' ? 'warning' : 'info'} /> },
    { key: 'created', label: 'Created', render: (k: ApiKey) => new Date(k.created_at).toLocaleDateString(), sortValue: (k: ApiKey) => k.created_at },
    { key: 'last_used', label: 'Last Used', render: (k: ApiKey) => k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never', sortValue: (k: ApiKey) => k.last_used || '' },
    { key: 'actions', label: 'Actions', render: (k: ApiKey) => k.is_active ? (
      <Button variant="danger" size="sm" onClick={() => handleRevoke(k.id)}>
        <XCircle size={10} /> Revoke
      </Button>
    ) : null },
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-4 gap-1.5">
          {[1,2,3,4].map((i) => <Skeleton key={i} height={48} variant="rect" />)}
        </div>
        <Skeleton height={200} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Key size={12} className="inline mr-1" /> API Key Management
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleToggleMode}>
            {mode === 'live' ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
            {mode === 'live' ? 'Live Mode' : 'Paper Mode'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowGenerate(true)}>
            <Plus size={12} /> Generate Key
          </Button>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={12} />
          </Button>
        </div>
      </div>

      <Card>
        {keys.length === 0 ? (
          <EmptyState title="No API keys" description="Generate your first API key to get started" variant="empty" />
        ) : (
          <DataTable columns={columns} data={keys} searchable exportable={false} />
        )}
      </Card>

      <Modal open={showGenerate} onClose={() => { setShowGenerate(false); setNewKeyResult(null) }} title="Generate API Key" width={400}>
        {newKeyResult ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Save this key — it will not be shown again.
            </div>
            <div className="p-2 rounded-sm text-xs font-mono break-all" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--accent-green)' }}>
              {newKeyResult}
            </div>
            <Button variant="primary" size="sm" onClick={() => { setShowGenerate(false); setNewKeyResult(null) }}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label="Key Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Trading Bot" />
            <Button variant="primary" size="sm" onClick={handleGenerate} disabled={!newLabel.trim()}>
              Generate
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
