import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/Skeleton'
import DataTable from '../components/ui/DataTable'
import Tabs from '../components/ui/Tabs'
import { useToastStore } from '../store/toast'
import {
  fetchSecurityData,
  fetchSecurityStats,
  fetchLoginActivity,
  updateSecuritySettings,
  banIpSecurity,
  unbanIpSecurity,
  clearSuspiciousIP,
  clearAPIAbuseIP,
  clearLoginHistory,
  type SecuritySettings,
  type SecurityStats,
  type BannedIP,
  type SuspiciousIP,
  type APIAbuseIP,
  type LoginAttemptEntry,
} from '../api/openalgo'
import { Shield, ShieldOff, Ban, RefreshCw, Save, Eye, EyeOff, Trash2 } from 'lucide-react'

export default function SecurityDashboard() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<SecuritySettings>({
    auto_ban_enabled: false, '404_threshold': 100, '404_ban_duration': 0,
    api_threshold: 100, api_ban_duration: 0, repeat_offender_limit: 2,
  })
  const [formSettings, setFormSettings] = useState<SecuritySettings>(settings)
  const [stats, setStats] = useState<SecurityStats>({
    total_bans: 0, permanent_bans: 0, temporary_bans: 0, suspicious_ips: 0, near_threshold: 0,
  })
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([])
  const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIP[]>([])
  const [apiAbuseIPs, setAPIAbuseIPs] = useState<APIAbuseIP[]>([])
  const [loginAttempts, setLoginAttempts] = useState<LoginAttemptEntry[]>([])
  const [banIP, setBanIP] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('24')
  const [showBanModal, setShowBanModal] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const load = async () => {
    setLoading(true)
    try {
      const [data, st, login] = await Promise.all([
        fetchSecurityData(),
        fetchSecurityStats(),
        fetchLoginActivity(),
      ])
      setBannedIPs(data.banned_ips)
      setSuspiciousIPs(data.suspicious_ips)
      setAPIAbuseIPs(data.api_abuse_ips)
      setSettings(data.security_settings)
      setFormSettings(data.security_settings)
      setStats(st)
      setLoginAttempts(login)
    } catch (err: any) {
      addToast(`Failed to load security data: ${err?.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSaveSettings = async () => {
    try {
      await updateSecuritySettings({
        auto_ban_enabled: formSettings.auto_ban_enabled,
        '404_threshold': formSettings['404_threshold'],
        '404_ban_duration': formSettings['404_ban_duration'],
        api_threshold: formSettings.api_threshold,
        api_ban_duration: formSettings.api_ban_duration,
        repeat_offender_limit: formSettings.repeat_offender_limit,
      })
      setSettings(formSettings)
      addToast('Security settings saved', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleBanIP = async () => {
    if (!banIP.trim()) return
    try {
      await banIpSecurity(banIP, banReason, parseInt(banDuration) || 24)
      addToast(`IP ${banIP} banned`, 'success')
      setShowBanModal(false)
      setBanIP('')
      setBanReason('')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleUnban = async (ip: string) => {
    try {
      await unbanIpSecurity(ip)
      addToast(`IP ${ip} unbanned`, 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleClearLoginHistory = async () => {
    try {
      await clearLoginHistory()
      setLoginAttempts([])
      addToast('Login history cleared', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const bannedCols = [
    { key: 'ip', label: 'IP', render: (r: BannedIP) => <span className="font-mono text-[10px]">{r.ip_address}</span>, sortable: true, sortValue: (r: BannedIP) => r.ip_address },
    { key: 'reason', label: 'Reason', render: (r: BannedIP) => r.ban_reason },
    { key: 'type', label: 'Type', render: (r: BannedIP) => <Badge label={r.is_permanent ? 'Permanent' : 'Temporary'} variant={r.is_permanent ? 'error' : 'warning'} /> },
    { key: 'count', label: 'Count', render: (r: BannedIP) => r.ban_count, align: 'right' as const },
    { key: 'banned_at', label: 'Banned At', render: (r: BannedIP) => r.banned_at, sortValue: (r: BannedIP) => r.banned_at },
    { key: 'expires', label: 'Expires', render: (r: BannedIP) => r.expires_at },
    { key: 'actions', label: '', render: (r: BannedIP) => (
      <Button variant="ghost" size="sm" onClick={() => handleUnban(r.ip_address)}><ShieldOff size={10} /></Button>
    )},
  ]

  const suspiciousCols = [
    { key: 'ip', label: 'IP', render: (r: SuspiciousIP) => <span className="font-mono text-[10px]">{r.ip_address}</span>, sortable: true },
    { key: 'errors', label: '404 Errors', render: (r: SuspiciousIP) => r.error_count, align: 'right' as const, sortable: true },
    { key: 'first', label: 'First', render: (r: SuspiciousIP) => r.first_error_at },
    { key: 'last', label: 'Last', render: (r: SuspiciousIP) => r.last_error_at },
    { key: 'actions', label: '', render: (r: SuspiciousIP) => (
      <Button variant="ghost" size="sm" onClick={async () => { await clearSuspiciousIP(r.ip_address); load() }}><Trash2 size={10} /></Button>
    )},
  ]

  const apiAbuseCols = [
    { key: 'ip', label: 'IP', render: (r: APIAbuseIP) => <span className="font-mono text-[10px]">{r.ip_address}</span>, sortable: true },
    { key: 'attempts', label: 'Attempts', render: (r: APIAbuseIP) => r.attempt_count, align: 'right' as const, sortable: true },
    { key: 'first', label: 'First', render: (r: APIAbuseIP) => r.first_attempt_at },
    { key: 'last', label: 'Last', render: (r: APIAbuseIP) => r.last_attempt_at },
    { key: 'actions', label: '', render: (r: APIAbuseIP) => (
      <Button variant="ghost" size="sm" onClick={async () => { await clearAPIAbuseIP(r.ip_address); load() }}><Trash2 size={10} /></Button>
    )},
  ]

  const loginCols = [
    { key: 'username', label: 'Username', render: (r: LoginAttemptEntry) => r.username, sortable: true },
    { key: 'ip', label: 'IP', render: (r: LoginAttemptEntry) => r.ip_address || '—' },
    { key: 'status', label: 'Status', render: (r: LoginAttemptEntry) => (
      <Badge label={r.status} variant={r.status === 'success' ? 'success' : 'error'} />
    )},
    { key: 'type', label: 'Type', render: (r: LoginAttemptEntry) => r.login_type || '—' },
    { key: 'broker', label: 'Broker', render: (r: LoginAttemptEntry) => r.broker || '—' },
    { key: 'reason', label: 'Failure', render: (r: LoginAttemptEntry) => r.failure_reason || '—' },
    { key: 'time', label: 'Time', render: (r: LoginAttemptEntry) => r.timestamp || '—', sortValue: (r: LoginAttemptEntry) => r.timestamp || '' },
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} height={64} variant="rect" />)}
        </div>
        <Skeleton height={300} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Shield size={12} className="inline mr-1" /> Security Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowBanModal(true)}><Ban size={10} /> Ban IP</Button>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        <Card className="p-2"><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Bans</div><div className="text-lg font-bold font-mono">{stats.total_bans}</div></Card>
        <Card className="p-2"><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Permanent</div><div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-red)' }}>{stats.permanent_bans}</div></Card>
        <Card className="p-2"><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Temporary</div><div className="text-lg font-bold font-mono" style={{ color: 'var(--accent-yellow)' }}>{stats.temporary_bans}</div></Card>
        <Card className="p-2"><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Suspicious IPs</div><div className="text-lg font-bold font-mono" style={{ color: stats.suspicious_ips > 0 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>{stats.suspicious_ips}</div></Card>
        <Card className="p-2"><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Near Threshold</div><div className="text-lg font-bold font-mono" style={{ color: stats.near_threshold > 0 ? 'var(--accent-orange)' : 'var(--text-primary)' }}>{stats.near_threshold}</div></Card>
      </div>

      <Tabs tabs={[
        {
          id: 'settings',
          label: 'Settings',
          content: (
            <Card title="Auto-Ban Configuration">
              <div className="flex flex-col gap-3 max-w-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>Auto-Ban Enabled</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formSettings.auto_ban_enabled}
                      onChange={(e) => setFormSettings((p) => ({ ...p, auto_ban_enabled: e.target.checked }))} />
                    <div className="w-8 h-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all"
                      style={{ background: formSettings.auto_ban_enabled ? 'var(--accent-cyan)' : 'var(--border-color)' }} />
                  </label>
                </div>
                <Input label="404 Threshold" type="number" value={formSettings['404_threshold']}
                  onChange={(e) => setFormSettings((p) => ({ ...p, '404_threshold': Number(e.target.value) }))} />
                <Input label="404 Ban Duration (hours, 0 = permanent)" type="number" value={formSettings['404_ban_duration']}
                  onChange={(e) => setFormSettings((p) => ({ ...p, '404_ban_duration': Number(e.target.value) }))} />
                <Input label="API Key Threshold" type="number" value={formSettings.api_threshold}
                  onChange={(e) => setFormSettings((p) => ({ ...p, api_threshold: Number(e.target.value) }))} />
                <Input label="API Key Ban Duration (hours)" type="number" value={formSettings.api_ban_duration}
                  onChange={(e) => setFormSettings((p) => ({ ...p, api_ban_duration: Number(e.target.value) }))} />
                <Input label="Repeat Offender Limit" type="number" value={formSettings.repeat_offender_limit}
                  onChange={(e) => setFormSettings((p) => ({ ...p, repeat_offender_limit: Number(e.target.value) }))} />
                <div><Button variant="primary" size="sm" onClick={handleSaveSettings}><Save size={12} /> Save Settings</Button></div>
              </div>
            </Card>
          ),
        },
        {
          id: 'banned',
          label: `Banned IPs (${bannedIPs.length})`,
          content: (
            <Card>
              <DataTable columns={bannedCols as any} data={bannedIPs as any} searchable exportFilename="banned-ips" />
            </Card>
          ),
        },
        {
          id: 'suspicious',
          label: `Suspicious (${suspiciousIPs.length})`,
          content: (
            <Card title="404 Error Tracking">
              <DataTable columns={suspiciousCols as any} data={suspiciousIPs as any} searchable exportFilename="suspicious-ips" />
            </Card>
          ),
        },
        {
          id: 'apiabuse',
          label: `API Abuse (${apiAbuseIPs.length})`,
          content: (
            <Card title="Invalid API Key Attempts">
              <DataTable columns={apiAbuseCols as any} data={apiAbuseIPs as any} searchable exportFilename="api-abuse" />
            </Card>
          ),
        },
        {
          id: 'login',
          label: `Login Activity (${loginAttempts.length})`,
          content: (
            <Card title="Login Attempts" actions={
              <Button variant="danger" size="sm" onClick={handleClearLoginHistory}><Trash2 size={10} /> Clear</Button>
            }>
              <DataTable columns={loginCols as any} data={loginAttempts as any} searchable exportFilename="login-activity" />
            </Card>
          ),
        },
      ]} />

      <Modal open={showBanModal} onClose={() => setShowBanModal(false)} title="Ban IP Address" width={360}>
        <div className="flex flex-col gap-3">
          <Input label="IP Address" value={banIP} onChange={(e) => setBanIP(e.target.value)} placeholder="e.g. 192.168.1.1" />
          <Input label="Reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="e.g. Suspicious activity" />
          <Input label="Duration (hours, 0 = permanent)" type="number" value={banDuration} onChange={(e) => setBanDuration(e.target.value)} />
          <Button variant="danger" size="sm" onClick={handleBanIP} disabled={!banIP.trim()}><Ban size={10} /> Ban IP</Button>
        </div>
      </Modal>
    </div>
  )
}
