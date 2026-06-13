import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { Key, Plus, Copy, RefreshCw } from 'lucide-react'

export default function MCPOAuthConfig() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [uris, setUris] = useState('')
  const [regResult, setRegResult] = useState<any | null>(null)
  const [discovery, setDiscovery] = useState<any | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = async () => {
    setLoading(true)
    try {
      const [clientsRes, discRes] = await Promise.all([
        fetch('/api/mcp/oauth/clients'),
        fetch('/.well-known/oauth-authorization-server'),
      ])
      if (clientsRes.ok) setClients((await clientsRes.json()).clients ?? [])
      if (discRes.ok) setDiscovery(await discRes.json())
    } catch {
      addToast('Failed to load OAuth config', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRegister = async () => {
    try {
      const redirectList = uris.split('\n').map((s) => s.trim()).filter(Boolean)
      const res = await fetch('/api/mcp/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: name, redirect_uris: redirectList }),
      })
      if (!res.ok) throw new Error((await res.text()).slice(0, 200))
      const data = await res.json()
      setRegResult(data)
      addToast('Client registered', 'success')
      setShowForm(false)
      load()
    } catch (err: any) {
      addToast(`Registration failed: ${err.message}`, 'error')
    }
  }

  const copySecret = () => {
    if (regResult?.client_secret) {
      navigator.clipboard.writeText(regResult.client_secret)
      addToast('Secret copied', 'success')
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
          <Key size={12} className="inline mr-1" /> MCP OAuth
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setRegResult(null) }}><Plus size={12} /> Register Client</Button>
        </div>
      </div>

      {showForm && (
        <Card title="Register OAuth Client">
          <div className="flex flex-col gap-3">
            <Input label="Client Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. claude-desktop" />
            <label className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Redirect URIs (one per line)</label>
            <textarea className="w-full p-2 rounded text-[11px] font-mono" rows={3} value={uris} onChange={(e) => setUris(e.target.value)} placeholder="https://claude.ai/oauth/callback" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', resize: 'vertical' }} />
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setRegResult(null) }}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleRegister}>Register</Button>
            </div>
          </div>
        </Card>
      )}

      {regResult && (
        <Card title="Client Registered">
          <div className="flex flex-col gap-2">
            <Input label="Client ID" value={regResult.client_id} readOnly />
            <div className="relative">
              <Input label="Client Secret" value={regResult.client_secret} readOnly type="password" />
              <button onClick={copySecret} className="absolute right-2 top-1/2" style={{ marginTop: 8 }}><Copy size={12} /></button>
            </div>
            <Badge label="Save this secret — it won't be shown again" variant="warning" />
          </div>
        </Card>
      )}

      <Card title={`Registered Clients (${clients.length})`}>
        {clients.length === 0 ? (
          <div className="text-[10px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>No OAuth clients registered</div>
        ) : (
          <div className="flex flex-col">
            {clients.map((c) => (
              <div key={c.client_id} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex flex-col">
                  <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{c.client_name || 'Unnamed'}</span>
                  <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{c.client_id}</span>
                </div>
                <Badge label={c.grant_types?.join(', ') || 'authorization_code'} variant="info" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {discovery && (
        <Card title="Discovery Endpoints">
          <div className="flex flex-col gap-1">
            {Object.entries(discovery).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{key}:</span>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-primary)' }}>{String(val).slice(0, 80)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
