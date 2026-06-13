import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Tabs from '../components/ui/Tabs'
import DataTable from '../components/ui/DataTable'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import {
  fetchSecurityData,
  fetchSecurityStats,
  fetchLoginActivity,
  updateSecuritySettings,
  banIP,
  unbanIP,
  clear404Tracker,
  fetchSecuritySettings,
} from '../api/security'
import { Shield, ShieldOff, Ban, RefreshCw, Save, Trash2, Globe } from 'lucide-react'

export default function SecurityAdmin() {
  const [loading, setLoading] = useState(true)
  const [bannedIPs, setBannedIPs] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total_bans: 0, active_bans: 0, total_404_count: 0, invalid_api_key_count: 0 })
  const [settings, setSettings] = useState<any>({})
  const [formSettings, setFormSettings] = useState<any>({})
  const [tracker404, setTracker404] = useState<Record<string, any>>({})
  const [loginAttempts, setLoginAttempts] = useState<any[]>([])
  const [showBanModal, setShowBanModal] = useState(false)
  const [showHostModal, setShowHostModal] = useState(false)
  const [banIPInput, setBanIPInput] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('24')
  const [banPermanent, setBanPermanent] = useState(false)
  const [hostname, setHostname] = useState('')
  const [hostReason, setHostReason] = useState('')
  const addToast = useToastStore((s) => s.addToast)

  const load = async () => {
    setLoading(true)
    try {
      const [data, st, login, setts]: any[] = await Promise.all([
        fetchSecurityData(),
        fetchSecurityStats(),
        fetchLoginActivity(),
        fetchSecuritySettings(),
      ])
      setBannedIPs(data.banned_ips || [])
      setStats(st)
      setTracker404(data.tracker_404 || {})
      setSettings(setts)
      setFormSettings(setts)
      setLoginAttempts(login.attempts || [])
    } catch (err: any) {
      addToast(`Failed to load security data: ${err?.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSaveSettings = async () => {
    try {
      await updateSecuritySettings(formSettings)
      setSettings(formSettings)
      addToast('Security settings saved', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleBanIP = async () => {
    if (!banIPInput.trim()) return
    try {
      await banIP(banIPInput, banReason, parseInt(banDuration) || 24, banPermanent)
      addToast(`IP ${banIPInput} banned`, 'success')
      setShowBanModal(false)
      setBanIPInput('')
      setBanReason('')
      setBanDuration('24')
      setBanPermanent(false)
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleUnban = async (ip: string) => {
    try {
      await unbanIP(ip)
      addToast(`IP ${ip} unbanned`, 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleClear404 = async (ip: string) => {
    try {
      await clear404Tracker(ip)
      addToast(`404 tracker cleared for ${ip}`, 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleBanHost = async () => {
    if (!hostname.trim()) return
    try {
      await banIP(hostname, hostReason, 24, false)
      addToast(`Host ${hostname} banned`, 'success')
      setShowHostModal(false)
      setHostname('')
      setHostReason('')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const safeStr = (v: any) => v ?? '—'

  const bannedCols = [
    { key: 'ip', label: 'IP', render: (r: any) => <span className="font-mono text-[10px]">{safeStr(r.ip_address)}</span>, sortable: true, sortValue: (r: any) => r.ip_address || '' },
    { key: 'reason', label: 'Reason', render: (r: any) => safeStr(r.reason) },
    { key: 'type', label: 'Type', render: (r: any) => <Badge label={r.is_permanent ? 'Permanent' : 'Temporary'} variant={r.is_permanent ? 'error' : 'warning'} /> },
    { key: 'count', label: 'Count', render: (r: any) => r.ban_count ?? 1, align: 'right' as const },
    { key: 'banned_at', label: 'Banned At', render: (r: any) => safeStr(r.banned_at ? new Date(r.banned_at).toLocaleString() : '—') },
    { key: 'expires', label: 'Expires', render: (r: any) => r.is_permanent ? '—' : safeStr(r.expires_at ? new Date(r.expires_at).toLocaleString() : '—') },
    { key: 'created_by', label: 'By', render: (r: any) => safeStr(r.created_by) },
    { key: 'actions', label: '', render: (r: any) => (
      <Button variant="ghost" size="sm" onClick={() => handleUnban(r.ip_address)}><ShieldOff size={10} /></Button>
    )},
  ]

  const trackerCols = [
    { key: 'ip', label: 'IP', render: (r: any) => <span className="font-mono text-[10px]">{r.ip}</span>, sortable: true },
    { key: 'count', label: 'Count', render: (r: any) => r.count, align: 'right' as const, sortable: true },
    { key: 'last_seen', label: 'Last Seen', render: (r: any) => r.last_seen ? new Date(r.last_seen * 1000).toLocaleString() : '—' },
    { key: 'actions', label: '', render: (r: any) => (
      <Button variant="ghost" size="sm" onClick={() => handleClear404(r.ip)}><Trash2 size={10} /></Button>
    )},
  ]

  const loginCols = [
    { key: 'username', label: 'Username', render: (r: any) => safeStr(r.username), sortable: true },
    { key: 'ip', label: 'IP', render: (r: any) => safeStr(r.ip_address) },
    { key: 'status', label: 'Status', render: (r: any) => (
      <Badge label={r.status || 'unknown'} variant={r.status === 'success' ? 'success' : 'error'} />
    )},
    { key: 'broker', label: 'Broker', render: (r: any) => safeStr(r.broker) },
    { key: 'reason', label: 'Reason', render: (r: any) => safeStr(r.reason || r.failure_reason) },
    { key: 'time', label: 'Time', render: (r: any) => safeStr(r.timestamp ? new Date(r.timestamp).toLocaleString() : '—') },
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} variant="rect" />)}
        </div>
        <Skeleton height={300} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Shield size={12} className="inline mr-1" /> Security Admin
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowHostModal(true)}><Globe size={10} /> Ban Host</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowBanModal(true)}><Ban size={10} /> Ban IP</Button>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Card className="p-2">
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Bans</div>
          <div className="text-lg font-bold font-mono">{stats.total_bans}</div>
        </Card>
        <Card className="p-2">
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Bans</div>
          <div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-red)' }}>{stats.active_bans}</div>
        </Card>
        <Card className="p-2">
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>404 Count</div>
          <div className="text-lg font-bold font-mono" style={{ color: stats.total_404_count > 0 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>{stats.total_404_count}</div>
        </Card>
        <Card className="p-2">
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Invalid API Keys</div>
          <div className="text-lg font-bold font-mono" style={{ color: stats.invalid_api_key_count > 0 ? 'var(--accent-orange)' : 'var(--text-primary)' }}>{stats.invalid_api_key_count}</div>
        </Card>
      </div>

      <Tabs tabs={[
        {
          id: 'banned',
          label: `Banned IPs (${bannedIPs.length})`,
          content: (
            <Card>
              <DataTable columns={bannedCols} data={bannedIPs} searchable exportFilename="banned-ips" />
            </Card>
          ),
        },
        {
          id: '404',
          label: `404 Tracker (${Object.keys(tracker404).length})`,
          content: (
            <Card title="404 Error Tracking">
              <DataTable
                columns={trackerCols}
                data={Object.entries(tracker404).map(([ip, info]: [string, any]) => ({ ip, ...info }))}
                searchable
                exportFilename="404-tracker"
              />
            </Card>
          ),
        },
        {
          id: 'settings',
          label: 'Settings',
          content: (
            <Card title="Auto-Ban Configuration">
              <div className="flex flex-col gap-3 max-w-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>Auto-Ban Enabled</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formSettings.auto_ban_enabled ?? false}
                      onChange={(e) => setFormSettings((p: any) => ({ ...p, auto_ban_enabled: e.target.checked }))} />
                    <div className="w-8 h-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"
                      style={{ background: formSettings.auto_ban_enabled ? 'var(--accent-cyan)' : 'var(--border-color)' }} />
                  </label>
                </div>
                <Input label="404 Threshold" type="number" value={formSettings.auto_ban_threshold_404 ?? 50}
                  onChange={(e) => setFormSettings((p: any) => ({ ...p, auto_ban_threshold_404: Number(e.target.value) }))} />
                <Input label="API Key Threshold" type="number" value={formSettings.auto_ban_threshold_api ?? 20}
                  onChange={(e) => setFormSettings((p: any) => ({ ...p, auto_ban_threshold_api: Number(e.target.value) }))} />
                <Input label="Ban Duration (hours)" type="number" value={formSettings.auto_ban_duration_hours ?? 24}
                  onChange={(e) => setFormSettings((p: any) => ({ ...p, auto_ban_duration_hours: Number(e.target.value) }))} />
                <Input label="Repeat Offender Limit" type="number" value={formSettings.repeat_offender_limit ?? 3}
                  onChange={(e) => setFormSettings((p: any) => ({ ...p, repeat_offender_limit: Number(e.target.value) }))} />
                <div><Button variant="primary" size="sm" onClick={handleSaveSettings}><Save size={12} /> Save Settings</Button></div>
              </div>
            </Card>
          ),
        },
        {
          id: 'login',
          label: `Login Activity (${loginAttempts.length})`,
          content: (
            <Card title="Login Attempts">
              <DataTable columns={loginCols} data={loginAttempts} searchable exportFilename="login-activity" />
            </Card>
          ),
        },
      ]} />

      <Modal open={showBanModal} onClose={() => setShowBanModal(false)} title="Ban IP Address" width={360}>
        <div className="flex flex-col gap-3">
          <Input label="IP Address" value={banIPInput} onChange={(e) => setBanIPInput(e.target.value)} placeholder="e.g. 192.168.1.1" />
          <Input label="Reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="e.g. Suspicious activity" />
          <Input label="Duration (hours)" type="number" value={banDuration} onChange={(e) => setBanDuration(e.target.value)} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="perm" checked={banPermanent} onChange={(e) => setBanPermanent(e.target.checked)} />
            <label htmlFor="perm" className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>Permanent</label>
          </div>
          <Button variant="danger" size="sm" onClick={handleBanIP} disabled={!banIPInput.trim()}><Ban size={10} /> Ban IP</Button>
        </div>
      </Modal>

      <Modal open={showHostModal} onClose={() => setShowHostModal(false)} title="Ban by Hostname" width={360}>
        <div className="flex flex-col gap-3">
          <Input label="Hostname" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="e.g. example.com" />
          <Input label="Reason" value={hostReason} onChange={(e) => setHostReason(e.target.value)} placeholder="e.g. Malicious host" />
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            The hostname will be resolved to an IP address and banned.
          </div>
          <Button variant="danger" size="sm" onClick={handleBanHost} disabled={!hostname.trim()}><Globe size={10} /> Ban Host</Button>
        </div>
      </Modal>
    </div>
  )
}
