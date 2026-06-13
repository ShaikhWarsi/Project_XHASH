import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import Tabs from '../components/ui/Tabs'
import { useToastStore } from '../store/toast'
import { fetchSandboxConfig, updateSandboxConfig, type SandboxConfig } from '../api/openalgo'
import { FlaskConical, Save, RefreshCw } from 'lucide-react'

export default function SandboxPage() {
  const [config, setConfig] = useState<SandboxConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    fetchSandboxConfig()
      .then(setConfig)
      .catch((err) => addToast(`Failed to load sandbox config: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      await updateSandboxConfig(config)
      addToast('Sandbox config saved', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-2 gap-1.5">
          <Skeleton height={200} variant="rect" />
          <Skeleton height={200} variant="rect" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <FlaskConical size={12} className="inline mr-1" /> Sandbox Configuration
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
            <Save size={12} /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Card title="General Settings">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>Enabled</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config?.enabled || false}
                  onChange={(e) => setConfig((prev) => prev ? { ...prev, enabled: e.target.checked } : prev)} />
                <div className="w-8 h-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"
                  style={{ background: config?.enabled ? 'var(--accent-cyan)' : 'var(--border-color)' }} />
              </label>
            </div>
            <Input label="Initial Balance" type="number" value={config?.initial_balance || 0}
              onChange={(e) => setConfig((prev) => prev ? { ...prev, initial_balance: Number(e.target.value) } : prev)} />
            <Input label="Leverage" type="number" step="0.1" value={config?.leverage || 1}
              onChange={(e) => setConfig((prev) => prev ? { ...prev, leverage: Number(e.target.value) } : prev)} />
            <Input label="Max Position Size" type="number" value={config?.max_position_size || 0}
              onChange={(e) => setConfig((prev) => prev ? { ...prev, max_position_size: Number(e.target.value) } : prev)} />
          </div>
        </Card>

        <Card title="Fee & Slippage">
          <div className="flex flex-col gap-3">
            <Input label="Fee Rate" type="number" step="0.0001" value={config?.fee_rate || 0}
              onChange={(e) => setConfig((prev) => prev ? { ...prev, fee_rate: Number(e.target.value) } : prev)} />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Slippage Model</span>
              <select className="w-full px-2 py-1 text-[10px] font-mono rounded-sm outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                value={config?.slippage_model || 'fixed'}
                onChange={(e) => setConfig((prev) => prev ? { ...prev, slippage_model: e.target.value } : prev)}>
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Allowed Symbols">
        <div className="flex flex-wrap gap-1">
          {config?.allowed_symbols?.map((sym) => (
            <Badge key={sym} label={sym} variant="info" />
          ))}
          {(!config?.allowed_symbols || config.allowed_symbols.length === 0) && (
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>All symbols allowed</span>
          )}
        </div>
      </Card>
    </div>
  )
}
