import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import WorkspaceManager from '../components/WorkspaceManager'
import IntegrationsSettings from '../components/IntegrationsSettings'
import ColorblindToggle from '../components/ColorblindToggle'
import BotsPanel from '../components/BotsPanel'
import LLMPanel from '../components/LLMPanel'
import WorkflowPanel from '../components/WorkflowPanel'
import { api } from '../api/client'
import { useTheme } from '../contexts/ThemeContext'
import Spinner from '../components/Spinner'

interface AppConfig {
  llm_provider: string
  api_key_configured: boolean
  max_position_size_pct: number
  max_leverage: number
  max_drawdown_pct: number
  stop_loss_atr: number
  data_providers: Record<string, boolean>
}

export default function Settings() {
  const { theme, setTheme, density, setDensity, fontSize, setFontSize } = useTheme()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [savedApiKey, setSavedApiKey] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('refresh_interval')
    return saved ? parseInt(saved, 10) : 5
  })

  useEffect(() => {
    localStorage.setItem('refresh_interval', String(refreshInterval))
  }, [refreshInterval])

  useEffect(() => {
    api.get('/config')
      .then((r) => setConfig(r.data))
      .catch(() => setMessage('Failed to load config'))
      .finally(() => setLoading(false))
  }, [])

  const update = (key: string, value: string | number | boolean) => {
    if (!config) return
    setConfig({ ...config, [key]: value })
  }

  const save = async () => {
    if (!config) return
    setSaving(true)
    setMessage('')
    try {
      await api.put('/config', config)
      setMessage('Settings saved')
    } catch {
      setMessage('Save failed')
    }
    setSaving(false)
  }

  const themes = [
    { value: 'auto' as const, label: 'Auto', desc: 'Follow system preference' },
    { value: 'classic' as const, label: 'Classic Dark', desc: 'Default dark terminal' },
    { value: 'matrix' as const, label: 'Matrix Green', desc: 'Green phosphor terminal' },
    { value: 'amber' as const, label: 'Amber Glow', desc: 'Warm amber CRT' },
    { value: 'cyber' as const, label: 'Cyber Neon', desc: 'Cyan/blue cyberpunk' },
    { value: 'terminal' as const, label: 'Terminal', desc: 'Minimalist monochrome' },
    { value: 'light' as const, label: 'Light', desc: 'Clean light mode' },
  ]

  if (loading) return <Spinner label="Loading settings..." />

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary">Settings</h1>

      {message && (
        <div className="text-sm px-4 py-2 rounded-lg" style={{
          background: message === 'Settings saved' ? 'var(--accent-green)20' : 'var(--accent-red)20',
          color: message === 'Settings saved' ? 'var(--accent-green)' : 'var(--accent-red)',
          border: `1px solid ${message === 'Settings saved' ? 'var(--accent-green)' : 'var(--accent-red)'}40`,
        }}>
          {message}
        </div>
      )}

      <Card title="Appearance">
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1 text-secondary">Theme</label>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className="text-left px-3 py-2 rounded-lg text-sm transition-all text-primary"
                  style={{
                    background: theme === t.value ? 'var(--accent-blue)20' : 'var(--bg-secondary)',
                    border: `1px solid ${theme === t.value ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                  }}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-muted text-xs">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <label className="block text-xs mb-1 text-secondary">Layout Density</label>
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as 'normal' | 'compact')}
                className="px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
              >
                <option value="normal">Normal</option>
                <option value="compact">Compact</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-secondary">Font Size</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={11}
                  max={18}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-primary">{fontSize}px</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <WorkspaceManager />

      <Card title="Integrations">
        <IntegrationsSettings />
      </Card>

      <Card title="API Configuration">
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1 text-secondary">LLM Provider</label>
            <select
              value={config?.llm_provider || ''}
              onChange={(e) => update('llm_provider', e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">API Key</label>
            <div className="flex gap-2 items-center">
              <input
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
              />
              <button
                onClick={async () => {
                  try {
                    await api.post('/config/api-key', { key: apiKeyInput })
                    setMessage('API key saved')
                    setSavedApiKey(true)
                  } catch {
                    setMessage('Failed to save API key')
                  }
                }}
                className="text-xs shrink-0 text-accent-blue"
              >
                Save Key
              </button>
              {(config?.api_key_configured || savedApiKey) && (
                <span className="text-xs shrink-0 text-up">✓ Configured</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Risk Limits">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-xs mb-1 text-secondary">Max Position Size</label>
            <input
              type="number"
              value={config?.max_position_size_pct ?? 15}
              onChange={(e) => update('max_position_size_pct', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            />
            <span className="text-xs mt-0.5 text-muted">% of portfolio</span>
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">Max Leverage</label>
            <input
              type="number"
              value={config?.max_leverage ?? 2}
              step={0.5}
              onChange={(e) => update('max_leverage', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">Max Drawdown</label>
            <input
              type="number"
              value={config?.max_drawdown_pct ?? 20}
              onChange={(e) => update('max_drawdown_pct', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            />
            <span className="text-xs mt-0.5 text-muted">%</span>
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">Stop Loss ATR</label>
            <input
              type="number"
              value={config?.stop_loss_atr ?? 2}
              step={0.5}
              onChange={(e) => update('stop_loss_atr', parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            />
            <span className="text-xs mt-0.5 text-muted">× ATR</span>
          </div>
        </div>
      </Card>

      <Card title="Accessibility">
        <ColorblindToggle />
      </Card>

      <Card title="Bot Integrations">
        <BotsPanel />
      </Card>

      <Card title="Workflow Orchestration">
        <WorkflowPanel />
      </Card>

      <Card title="LLM Playground">
        <LLMPanel />
      </Card>

      <Card title="Data Refresh">
        <div className="flex items-center gap-3">
          <label className="text-[11px] text-secondary font-mono-data">
            Refresh interval
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={60}
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-30"
            />
            <span className="text-[11px] text-primary font-mono-data min-w-[50px]">
              {refreshInterval}s
            </span>
          </div>
        </div>
      </Card>

      <Card title="Data Providers">
        <div className="space-y-3">
          {config?.data_providers && Object.entries(config.data_providers).map(([provider, enabled]) => (
            <div key={provider} className="flex items-center justify-between py-1">
              <span className="text-sm capitalize text-primary">{provider.replace(/_/g, ' ')}</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{
                color: enabled ? 'var(--accent-green)' : 'var(--text-muted)',
                background: enabled ? 'var(--accent-green)15' : 'var(--bg-hover)',
              }}>
                {enabled ? 'Connected' : 'Not Configured'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <button
        onClick={save}
        disabled={saving}
        className="text-sm font-medium px-5 py-2 rounded-lg transition-colors text-white"
        style={{ background: 'var(--accent-blue)', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
