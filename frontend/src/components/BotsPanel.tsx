import { useEffect, useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Skeleton from './Skeleton'
import { fetchBots, toggleBot, testBot } from '../api/bots'
import type { BotStatus } from '../api/bots'
import { useToastStore } from '../store/toast'

const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }

export default function BotsPanel() {
  const addToast = useToastStore((s) => s.addToast)
  const [bots, setBots] = useState<BotStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchBots()
      setBots(res.bots)
    } catch (err: any) {
      addToast(err?.message || 'Failed to load bots', 'error')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (bot: BotStatus) => {
    setToggling(bot.name)
    try {
      await toggleBot(bot.name, !bot.enabled)
      setBots((prev) => prev.map((b) => (b.name === bot.name ? { ...b, enabled: !b.enabled } : b)))
      addToast(`${bot.name} ${bot.enabled ? 'disabled' : 'enabled'}`, 'success')
    } catch (err: any) {
      addToast(err?.message || 'Toggle failed', 'error')
    }
    setToggling(null)
  }

  const handleTest = async (bot: BotStatus) => {
    setTesting(bot.name)
    try {
      const res = await testBot(bot.name)
      addToast(res.message || `${bot.name} test ${res.success ? 'passed' : 'failed'}`, res.success ? 'success' : 'error')
    } catch (err: any) {
      addToast(err?.message || 'Test failed', 'error')
    }
    setTesting(null)
  }

  if (loading) {
    return (
      <Card title="BOT INTEGRATIONS">
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Skeleton width={80} height={14} />
            <Skeleton width={50} height={10} />
            <Skeleton width={40} height={10} />
          </div>
        ))}
      </Card>
    )
  }

  return (
    <Card title={`BOT INTEGRATIONS (${bots.length})`}>
      {bots.length === 0 ? (
        <div style={{ ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>No bots configured</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {bots.map((bot) => (
            <div key={bot.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)' }}>{bot.name}</span>
                  <Badge label={bot.type} variant="info" />
                  <Badge label={bot.enabled ? 'ENABLED' : 'DISABLED'} variant={bot.enabled ? 'success' : 'error'} />
                  <Badge label={bot.connected ? 'CONNECTED' : 'DISCONNECTED'} variant={bot.connected ? 'success' : 'default'} />
                </div>
                {bot.last_active && (
                  <div style={{ ...FONT_SM, color: 'var(--text-muted)', marginTop: 1 }}>
                    Last active: {new Date(bot.last_active).toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => handleToggle(bot)}
                  disabled={toggling === bot.name}
                  style={{
                    background: bot.enabled ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    border: 'none', ...FONT_SM, fontWeight: 600,
                    color: bot.enabled ? 'var(--accent-red)' : 'var(--accent-green)',
                    padding: '3px 10px', cursor: toggling === bot.name ? 'not-allowed' : 'pointer',
                    opacity: toggling === bot.name ? 0.6 : 1, borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {toggling === bot.name ? '...' : bot.enabled ? 'DISABLE' : 'ENABLE'}
                </button>
                <button
                  onClick={() => handleTest(bot)}
                  disabled={testing === bot.name}
                  style={{
                    background: 'var(--bg-hover)', border: '1px solid var(--border-color)',
                    ...FONT_SM, color: 'var(--text-secondary)', padding: '3px 10px',
                    cursor: testing === bot.name ? 'not-allowed' : 'pointer',
                    opacity: testing === bot.name ? 0.6 : 1, borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {testing === bot.name ? '...' : 'TEST'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
