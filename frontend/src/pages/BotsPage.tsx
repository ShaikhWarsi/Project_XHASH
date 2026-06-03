import { useState } from 'react'
import Breadcrumbs from '../components/Breadcrumbs'
import Card from '../components/ui/Card'
import { api } from '../api/client'
import { useToastStore } from '../store/toast'

interface BotConfig {
  type: string
  name: string
  icon: string
  description: string
}

interface AlertRule {
  id: string
  enabled: boolean
  bot_type: string
  alert_types: string[]
  min_severity: string
}

const BOT_TYPES: BotConfig[] = [
  { type: 'discord', name: 'Discord', icon: '💬', description: 'Send alerts and signals to your Discord server via webhook' },
  { type: 'slack', name: 'Slack', icon: '🔷', description: 'Post updates to Slack channels using Incoming Webhooks' },
  { type: 'telegram', name: 'Telegram', icon: '✈️', description: 'Receive notifications via Telegram bot messages' },
]

const ALERT_TYPE_OPTIONS = ['signal', 'order_fill', 'error', 'drawdown', 'risk']
const SEVERITY_OPTIONS = ['INFO', 'WARN', 'ERROR', 'CRITICAL']

export default function BotsPage() {
  const [botModals, setBotModals] = useState<Record<string, boolean>>({})
  const [webhookInputs, setWebhookInputs] = useState<Record<string, string>>({})
  const [testingBot, setTestingBot] = useState<Record<string, 'idle' | 'testing' | 'success' | 'failure'>>({})
  const [channelLists, setChannelLists] = useState<Record<string, string[]>>({})
  const [listingChannels, setListingChannels] = useState<Record<string, boolean>>({})
  const [rules, setRules] = useState<AlertRule[]>([])
  const [newRule, setNewRule] = useState<AlertRule>({
    id: '',
    enabled: true,
    bot_type: 'discord',
    alert_types: ['signal'],
    min_severity: 'WARN',
  })
  const addToast = useToastStore((s) => s.addToast)

  const openModal = (type: string) => {
    setBotModals((m) => ({ ...m, [type]: true }))
  }

  const closeModal = (type: string) => {
    setBotModals((m) => ({ ...m, [type]: false }))
  }

  const handleConnect = async (type: string) => {
    const webhook = webhookInputs[type]
    if (!webhook) {
      addToast('Please enter a webhook URL / token', 'error')
      return
    }
    try {
      await api.post(`/bots/${type}/connect`, { webhook })
      addToast(`${type} connected successfully`, 'success')
      closeModal(type)
    } catch {
      addToast(`Failed to connect ${type}`, 'error')
    }
  }

  const handleTest = async (type: string) => {
    setTestingBot((t) => ({ ...t, [type]: 'testing' }))
    try {
      await api.post(`/bots/${type}/test`, { webhook: webhookInputs[type] || '' })
      setTestingBot((t) => ({ ...t, [type]: 'success' }))
      addToast(`${type} test message sent`, 'success')
    } catch {
      setTestingBot((t) => ({ ...t, [type]: 'failure' }))
      addToast(`${type} test failed`, 'error')
    }
  }

  const handleListChannels = async (type: string) => {
    setListingChannels((l) => ({ ...l, [type]: true }))
    try {
      const res = await api.get(`/bots/${type}/channels`)
      const channels = res.data.channels || res.data || []
      setChannelLists((c) => ({ ...c, [type]: channels }))
    } catch {
      addToast(`Failed to list ${type} channels`, 'error')
    }
    setListingChannels((l) => ({ ...l, [type]: false }))
  }

  const addRule = () => {
    const rule = { ...newRule, id: `rule_${Date.now()}` }
    setRules((r) => [...r, rule])
    setNewRule({ id: '', enabled: true, bot_type: 'discord', alert_types: ['signal'], min_severity: 'WARN' })
  }

  const deleteRule = (id: string) => {
    setRules((r) => r.filter((rule) => rule.id !== id))
  }

  const saveRules = async () => {
    try {
      await api.post('/bots/rules', { rules })
      addToast('Alert routing rules saved', 'success')
    } catch {
      addToast('Failed to save rules', 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <div className="grid grid-cols-3 gap-3">
        {BOT_TYPES.map((bot) => (
          <Card key={bot.type} title={bot.name}>
            <div className="flex flex-col items-center text-center space-y-3 py-2">
              <div className="text-3xl">{bot.icon}</div>
              <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{bot.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(bot.type)}
                  className="text-[10px] font-mono px-3 py-1.5 rounded-sm cursor-pointer"
                  style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}
                >
                  Connect
                </button>
                <button
                  onClick={() => handleTest(bot.type)}
                  disabled={testingBot[bot.type] === 'testing'}
                  className="text-[10px] font-mono px-3 py-1.5 rounded-sm cursor-pointer"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: testingBot[bot.type] === 'testing' ? 'var(--text-muted)' : 'var(--text-secondary)',
                  }}
                >
                  {testingBot[bot.type] === 'testing' ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              {testingBot[bot.type] === 'success' && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--accent-green)' }}>Test sent successfully ✔</span>
              )}
              {testingBot[bot.type] === 'failure' && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--accent-red)' }}>Test failed ✘</span>
              )}
              <button
                onClick={() => handleListChannels(bot.type)}
                disabled={listingChannels[bot.type]}
                className="text-[10px] font-mono underline cursor-pointer"
                style={{ color: 'var(--accent-cyan)', background: 'none', border: 'none' }}
              >
                {listingChannels[bot.type] ? 'Loading...' : 'List Channels'}
              </button>
              {channelLists[bot.type] && channelLists[bot.type].length > 0 && (
                <div className="w-full text-left space-y-0.5">
                  {channelLists[bot.type].map((ch: any, i: number) => (
                    <div key={i} className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      • {typeof ch === 'string' ? ch : ch.name || ch.id || JSON.stringify(ch)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {BOT_TYPES.map((bot) => botModals[bot.type] && (
        <div
          key={`modal_${bot.type}`}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={() => closeModal(bot.type)}
        >
          <div
            className="rounded-sm p-4 max-w-sm w-full"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Connect {bot.name}
            </h3>
            <input
              type="text"
              value={webhookInputs[bot.type] || ''}
              onChange={(e) => setWebhookInputs((w) => ({ ...w, [bot.type]: e.target.value }))}
              placeholder={bot.type === 'telegram' ? 'Bot Token' : 'Webhook URL'}
              className="w-full px-2.5 py-1.5 text-[10px] font-mono outline-none rounded-sm mb-3"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--input-text)',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleConnect(bot.type)}
                className="text-[10px] font-mono px-3 py-1.5 rounded-sm cursor-pointer"
                style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}
              >
                Save & Connect
              </button>
              <button
                onClick={() => closeModal(bot.type)}
                className="text-[10px] font-mono px-3 py-1.5 rounded-sm cursor-pointer"
                style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ))}

      <Card title="ALERT ROUTING">
        <div className="space-y-3">
          {rules.length > 0 && (
            <table className="w-full text-[10px] font-mono" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-left py-1 px-1" style={{ color: 'var(--text-muted)' }}>Enabled</th>
                  <th className="text-left py-1 px-1" style={{ color: 'var(--text-muted)' }}>Bot Type</th>
                  <th className="text-left py-1 px-1" style={{ color: 'var(--text-muted)' }}>Alert Types</th>
                  <th className="text-left py-1 px-1" style={{ color: 'var(--text-muted)' }}>Min Severity</th>
                  <th className="text-right py-1 px-1" style={{ color: 'var(--text-muted)' }}></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="py-1 px-1">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => setRules((r) => r.map((rl) => rl.id === rule.id ? { ...rl, enabled: !rl.enabled } : rl))}
                        style={{ accentColor: 'var(--accent-green)' }}
                      />
                    </td>
                    <td className="py-1 px-1 capitalize" style={{ color: 'var(--text-primary)' }}>{rule.bot_type}</td>
                    <td className="py-1 px-1" style={{ color: 'var(--text-secondary)' }}>{rule.alert_types.join(', ')}</td>
                    <td className="py-1 px-1" style={{ color: 'var(--text-secondary)' }}>{rule.min_severity}</td>
                    <td className="py-1 px-1 text-right">
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-[9px] cursor-pointer"
                        style={{ color: 'var(--accent-red)', background: 'none', border: 'none' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1 text-[10px] font-mono cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={newRule.enabled}
                onChange={(e) => setNewRule((r) => ({ ...r, enabled: e.target.checked }))}
                style={{ accentColor: 'var(--accent-green)' }}
              />
              Enabled
            </label>
            <select
              value={newRule.bot_type}
              onChange={(e) => setNewRule((r) => ({ ...r, bot_type: e.target.value }))}
              className="text-[10px] font-mono px-2 py-1 rounded-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {BOT_TYPES.map((b) => <option key={b.type} value={b.type}>{b.name}</option>)}
            </select>
            <select
              multiple
              value={newRule.alert_types}
              onChange={(e) => setNewRule((r) => ({ ...r, alert_types: Array.from(e.target.selectedOptions, (o) => o.value) }))}
              className="text-[10px] font-mono px-2 py-1 rounded-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {ALERT_TYPE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={newRule.min_severity}
              onChange={(e) => setNewRule((r) => ({ ...r, min_severity: e.target.value }))}
              className="text-[10px] font-mono px-2 py-1 rounded-sm"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={addRule}
              className="text-[10px] font-mono px-2 py-1 rounded-sm cursor-pointer"
              style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}
            >
              Add Rule
            </button>
          </div>
          {rules.length > 0 && (
            <button
              onClick={saveRules}
              className="text-[10px] font-mono px-3 py-1.5 rounded-sm cursor-pointer"
              style={{ background: 'var(--accent-green)', color: '#fff', border: 'none' }}
            >
              Save Rules
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}
