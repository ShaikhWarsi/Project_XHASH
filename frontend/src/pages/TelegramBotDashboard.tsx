import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { MessageSquare, Send, RefreshCw } from 'lucide-react'

interface BotConfig {
  bot_token: string
  chat_id: string
}

interface BotState {
  name: string
  type: string
  enabled: boolean
  connected: boolean
  config: BotConfig
  last_active?: string
}

export default function TelegramBotDashboard() {
  const [bot, setBot] = useState<BotState | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/bots/telegram-signals')
      if (res.ok) setBot(await res.json())
    } catch {
      addToast('Failed to load bot config', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = async () => {
    if (!bot) return
    try {
      const res = await fetch(`/api/integrations/bots/telegram-signals/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !bot.enabled }),
      })
      const data = await res.json()
      setBot(data.bot)
      addToast(`Bot ${data.bot.enabled ? 'enabled' : 'disabled'}`, 'success')
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, 'error')
    }
  }

  const updateConfig = async (key: string, value: string) => {
    if (!bot) return
    try {
      const res = await fetch(`/api/integrations/bots/telegram-signals/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...bot.config, [key]: value } }),
      })
      const data = await res.json()
      setBot(data.bot)
      addToast('Config updated', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, 'error')
    }
  }

  const test = async () => {
    if (!bot) return
    try {
      const res = await fetch(`/api/integrations/bots/telegram-signals/test`, { method: 'POST' })
      const data = await res.json()
      addToast(data.message, data.success ? 'success' : 'error')
      if (data.success) load()
    } catch (err: any) {
      addToast(`Test failed: ${err.message}`, 'error')
    }
  }

  const sendMessage = async () => {
    if (!bot || !message.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/integrations/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_name: 'telegram-signals', title: 'Manual', message, level: 'info' }),
      })
      const data = await res.json()
      addToast(data.message, data.success ? 'success' : 'error')
      if (data.success) setMessage('')
    } catch (err: any) {
      addToast(`Send failed: ${err.message}`, 'error')
    } finally {
      setSending(false)
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
          <MessageSquare size={12} className="inline mr-1" /> Telegram Bot
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant={bot?.enabled ? 'danger' : 'primary'} size="sm" onClick={toggle}>
            {bot?.enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      <Card title="Configuration">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Badge label={bot?.connected ? 'Connected' : 'Disconnected'} variant={bot?.connected ? 'success' : 'error'} />
            {bot?.last_active && <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>Last active: {new Date(bot.last_active).toLocaleString()}</span>}
          </div>
          <Input label="Bot Token" type="password" value={bot?.config?.bot_token ?? ''} onChange={(e) => updateConfig('bot_token', e.target.value)} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
          <Input label="Chat ID" value={bot?.config?.chat_id ?? ''} onChange={(e) => updateConfig('chat_id', e.target.value)} placeholder="-1001234567890" />
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={test}>Test Connection</Button>
          </div>
        </div>
      </Card>

      <Card title="Send Message">
        <div className="flex flex-col gap-2">
          <Input label="Message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message to send..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} />
          <div className="flex items-center gap-2 justify-end">
            <Button variant="primary" size="sm" onClick={sendMessage} loading={sending} disabled={!bot?.enabled}>
              <Send size={12} /> Send
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Commands">
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          {['/start - Welcome message', '/help - Show commands', '/orders - View open orders', '/positions - View positions', '/portfolio - Portfolio summary', '/balance - Account balance'].map((cmd) => (
            <div key={cmd} style={{ color: 'var(--text-muted)' }}>{cmd}</div>
          ))}
        </div>
      </Card>
    </div>
  )
}
