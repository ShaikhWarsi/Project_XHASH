import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { MessageCircle, Phone, Power, Users, Settings, BarChart3, RefreshCw, X } from 'lucide-react'
import {
  getWhatsAppBotStatus,
  getWhatsAppConfig,
  getWhatsAppStats,
  getWhatsAppUsers,
  startWhatsAppBot,
  stopWhatsAppBot,
  pairWhatsApp,
  unlinkWhatsApp,
  unlinkWhatsAppUser,
  getPairingStatus,
  sendWhatsAppMessage,
  broadcastWhatsApp,
  updateWhatsAppConfig,
} from '../api/whatsapp'

interface BotStatus {
  status: string
  pairing_code: string | null
  qr_code: string | null
  connected_jid: string | null
  started_at: number | null
  message_count: number
  alert_count: number
}

interface BotConfig {
  webhook_url: string
  auto_start: boolean
  notification_types: {
    order_fill: boolean
    signal: boolean
    error: boolean
    drawdown: boolean
    risk: boolean
  }
}

interface LinkedUser {
  jid: string
  username: string
  phone: string
  linked_at: number
  alerts_enabled: boolean
}

export default function WhatsAppBotPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<LinkedUser[]>([])
  const [phoneInput, setPhoneInput] = useState('')
  const [messageText, setMessageText] = useState('')
  const [broadcastText, setBroadcastText] = useState('')
  const [sending, setSending] = useState(false)
  const [pairingModal, setPairingModal] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingInProgress, setPairingInProgress] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [statusRes, configRes, statsRes, usersData]: any[] = await Promise.all([
        getWhatsAppBotStatus(),
        getWhatsAppConfig(),
        getWhatsAppStats(),
        getWhatsAppUsers(),
      ])
      setStatus(statusRes.status)
      setConfig(configRes.config)
      setStats(statsRes.stats)
      setUsers(usersData)
    } catch (err: any) {
      addToast(`Failed to load data: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const handleStart = async () => {
    try {
      const res: any = await startWhatsAppBot()
      addToast(res.message || 'Bot started', 'success')
      loadAll()
    } catch (err: any) {
      addToast(`Start failed: ${err.message}`, 'error')
    }
  }

  const handleStop = async () => {
    try {
      const res: any = await stopWhatsAppBot()
      addToast(res.message || 'Bot stopped', 'success')
      loadAll()
    } catch (err: any) {
      addToast(`Stop failed: ${err.message}`, 'error')
    }
  }

  const handlePair = async () => {
    if (!phoneInput.trim()) {
      addToast('Enter a phone number', 'warning')
      return
    }
    setPairingInProgress(true)
    try {
      const res: any = await pairWhatsApp(phoneInput.trim())
      if (res.success) {
        setPairingCode(res.pairing_code || null)
        setPairingModal(true)
        addToast(res.message || 'Pairing initiated', 'success')
        loadAll()
      } else {
        addToast(res.message || 'Pairing failed', 'error')
      }
    } catch (err: any) {
      addToast(`Pair failed: ${err.message}`, 'error')
    } finally {
      setPairingInProgress(false)
    }
  }

  const handleUnlink = async () => {
    try {
      const res: any = await unlinkWhatsApp()
      addToast(res.message || 'Device unlinked', 'success')
      loadAll()
    } catch (err: any) {
      addToast(`Unlink failed: ${err.message}`, 'error')
    }
  }

  const handleUnlinkUser = async (jid: string) => {
    try {
      const res: any = await unlinkWhatsAppUser(jid)
      addToast(res.message || 'User unlinked', 'success')
      loadAll()
    } catch (err: any) {
      addToast(`Unlink failed: ${err.message}`, 'error')
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    setSending(true)
    try {
      const res: any = await sendWhatsAppMessage(status?.connected_jid || '', messageText.trim())
      addToast(res.message || 'Message sent', res.success ? 'success' : 'error')
      if (res.success) setMessageText('')
      loadAll()
    } catch (err: any) {
      addToast(`Send failed: ${err.message}`, 'error')
    } finally {
      setSending(false)
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return
    setSending(true)
    try {
      const res: any = await broadcastWhatsApp(broadcastText.trim())
      addToast(`Broadcast sent to ${res.total} users`, 'success')
      setBroadcastText('')
      loadAll()
    } catch (err: any) {
      addToast(`Broadcast failed: ${err.message}`, 'error')
    } finally {
      setSending(false)
    }
  }

  const handleConfigChange = async (key: string, value: any) => {
    if (!config) return
    try {
      const newConfig = { ...config, [key]: value }
      const res: any = await updateWhatsAppConfig(newConfig)
      if (res.success) setConfig(res.config)
      addToast('Config updated', 'success')
    } catch (err: any) {
      addToast(`Config update failed: ${err.message}`, 'error')
    }
  }

  const handleNotificationToggle = async (key: string) => {
    if (!config) return
    const newTypes = { ...config.notification_types, [key]: !config.notification_types[key as keyof typeof config.notification_types] }
    await handleConfigChange('notification_types', newTypes)
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'info' }> = {
      connected: { label: 'Connected', variant: 'success' },
      disconnected: { label: 'Disconnected', variant: 'error' },
      pairing: { label: 'Pairing...', variant: 'warning' },
      unpaired: { label: 'Unpaired', variant: 'info' },
      error: { label: 'Error', variant: 'error' },
    }
    const m = map[s] || { label: s, variant: 'info' as const }
    return <Badge label={m.label} variant={m.variant} />
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={200} variant="rect" />
        <Skeleton height={200} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <MessageCircle size={12} className="inline mr-1" /> WhatsApp Bot
        </h2>
        <Button variant="ghost" size="sm" onClick={loadAll}><RefreshCw size={12} /></Button>
      </div>

      <Card title="Status">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {status ? statusBadge(status.status) : <Badge label="Unknown" variant="default" />}
            {status?.connected_jid && (
              <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {status.connected_jid}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status?.status === 'connected' || status?.status === 'pairing' ? (
              <Button variant="danger" size="sm" onClick={handleStop}><Power size={12} /> Stop</Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleStart}><Power size={12} /> Start</Button>
            )}
            {status?.status === 'connected' && (
              <Button variant="secondary" size="sm" onClick={handleUnlink}><X size={12} /> Unlink</Button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Quick Actions">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Phone Number (with country code)"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="919876543210"
              />
            </div>
            <Button variant="primary" size="sm" onClick={handlePair} loading={pairingInProgress}>
              <Phone size={12} /> Pair
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Test Message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleSendMessage} loading={sending} disabled={!status?.connected_jid}>
              Send
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Broadcast Message"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Type a broadcast..."
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBroadcast() } }}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={handleBroadcast} loading={sending} disabled={users.length === 0}>
              Broadcast
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Configuration">
        <div className="flex flex-col gap-3">
          <Input
            label="Webhook URL"
            value={config?.webhook_url || ''}
            onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
            placeholder="https://hooks.example.com/whatsapp"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_start"
              checked={config?.auto_start || false}
              onChange={(e) => handleConfigChange('auto_start', e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)' }}
            />
            <label htmlFor="auto_start" className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>
              Auto-start on server boot
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Notification Types
            </span>
            <div className="grid grid-cols-2 gap-1">
              {['order_fill', 'signal', 'error', 'drawdown', 'risk'].map((key) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config?.notification_types?.[key as keyof typeof config.notification_types] || false}
                    onChange={() => handleNotificationToggle(key)}
                    style={{ accentColor: 'var(--accent-cyan)' }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Linked Users">
        {users.length === 0 ? (
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            No users linked. Pair a device to get started.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {users.map((user) => (
              <div
                key={user.jid}
                className="flex items-center justify-between px-2 py-1.5"
                style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>
                    {user.username || user.jid}
                  </span>
                  <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {user.phone} &middot; Linked {new Date(user.linked_at * 1000).toLocaleDateString()}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleUnlinkUser(user.jid)}>
                  <X size={10} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Stats">
        <div className="grid grid-cols-3 gap-3 p-1">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[16px] font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
              {stats?.message_count || 0}
            </span>
            <span className="text-[8px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
              Messages
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[16px] font-mono font-bold" style={{ color: 'var(--accent-green)' }}>
              {stats?.alert_count || 0}
            </span>
            <span className="text-[8px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
              Alerts
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[16px] font-mono font-bold" style={{ color: 'var(--accent-yellow)' }}>
              {stats?.linked_users || 0}
            </span>
            <span className="text-[8px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
              Users
            </span>
          </div>
        </div>
        {stats?.uptime_seconds != null && (
          <div className="text-[8px] font-mono text-center mt-1" style={{ color: 'var(--text-muted)' }}>
            Uptime: {Math.floor(stats.uptime_seconds / 60)}m {stats.uptime_seconds % 60}s
          </div>
        )}
      </Card>

      {pairingModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setPairingModal(false)}
        >
          <div
            className="p-4 rounded-lg max-w-sm w-full mx-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Pairing Code
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setPairingModal(false)}>
                <X size={12} />
              </Button>
            </div>
            {pairingCode ? (
              <div className="text-center">
                <p className="text-[9px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                  Use this code in WhatsApp to pair your device:
                </p>
                <div
                  className="text-lg font-mono font-bold tracking-widest py-3 px-4 rounded"
                  style={{ background: 'var(--bg-hover)', color: 'var(--accent-cyan)', letterSpacing: '0.15em' }}
                >
                  {pairingCode}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  Scanning for QR code or pairing code...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
