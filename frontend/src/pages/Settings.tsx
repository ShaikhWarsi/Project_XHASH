import { useEffect, useState, useCallback, useRef } from 'react'
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
import { useApiQuery } from '../hooks/useApiQuery'
import { useToastStore } from '../store/toast'

interface AppConfig {
  llm_provider: string
  api_key_configured: boolean
  max_position_size_pct: number
  max_sector_pct: number
  max_leverage: number
  max_drawdown_pct: number
  stop_loss_atr: number
  data_providers: Record<string, boolean>
}

const THEME_OPTIONS = [
  { value: 'auto', label: 'Auto', desc: 'Follow system preference' },
  { value: 'classic', label: 'Classic Dark', desc: 'Default dark terminal' },
  { value: 'matrix', label: 'Matrix Green', desc: 'Green phosphor terminal' },
  { value: 'amber', label: 'Amber Glow', desc: 'Warm amber CRT' },
  { value: 'cyber', label: 'Cyber Neon', desc: 'Cyan/blue cyberpunk' },
  { value: 'terminal', label: 'Terminal', desc: 'Minimalist monochrome' },
  { value: 'light', label: 'Light', desc: 'Clean light mode' },
  { value: 'bloomberg', label: 'Bloomberg', desc: 'Dark blue terminal' },
  { value: 'trader', label: 'Trader', desc: 'High-contrast green-on-black' },
]

const TIMEZONE_OPTIONS = [
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Hong_Kong',
  'Asia/Singapore', 'UTC',
]

const LOCALE_OPTIONS = ['en-US', 'en-GB', 'de-DE', 'ja-JP', 'zh-CN', 'fr-FR']
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD']

const CHART_LAYOUTS = ['1x1', '2x1', '1x2', '2x2']
const CHART_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']

const DEFAULT_INDICATORS = ['SMA_20', 'EMA_50', 'RSI_14', 'MACD', 'BB_20_2', 'VWAP']

const DEFAULT_HOTKEYS: Record<string, string> = {
  'Symbol Search': 'Ctrl+K',
  'Toggle Order Entry': 'Ctrl+O',
  'Toggle Drawing Tools': 'Ctrl+D',
  'Toggle Structure Overlay': 'Ctrl+S',
  'Toggle Signal Timeline': 'Ctrl+T',
  'Toggle Compare': 'Ctrl+M',
  'Toggle Layout': 'Ctrl+L',
  'Toggle Replay Mode': 'Ctrl+R',
  'Toggle Fullscreen': 'F11',
}

const WIDGETS = ['Chart', 'Dashboard', 'Signals', 'Portfolio', 'Orders'] as const

function loadLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function Settings() {
  const { theme, setTheme, density, setDensity, fontSize, setFontSize } = useTheme()
  const { data: configData, isLoading } = useApiQuery<AppConfig>('/config')
  const [config, setConfig] = useState<AppConfig | null>(null)
  const originalRef = useRef<string>('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [savedApiKey, setSavedApiKey] = useState(false)
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false)
  const [providerTesting, setProviderTesting] = useState<Record<string, 'idle' | 'testing' | 'success' | 'failure'>>({})
  const [localization, setLocalization] = useState(() =>
    loadLocalJson('settings_localization', { timezone: 'UTC', locale: 'en-US', currency: 'USD', decimals: 2 })
  )
  const [chartDefaults, setChartDefaults] = useState(() =>
    loadLocalJson('settings_chartDefaults', { layout: '1x1', timeframe: '1h', indicators: 'SMA_20, EMA_50, RSI_14' })
  )
  const [hotkeys, setHotkeys] = useState<Record<string, string>>(() =>
    loadLocalJson('settings_hotkeys', DEFAULT_HOTKEYS)
  )
  const [rebindingHotkey, setRebindingHotkey] = useState<string | null>(null)
  const [widgetRefresh, setWidgetRefresh] = useState(() =>
    loadLocalJson('settings_widgetRefresh', { Chart: 5, Dashboard: 10, Signals: 5, Portfolio: 15, Orders: 10 })
  )

  useEffect(() => {
    localStorage.setItem('settings_localization', JSON.stringify(localization))
  }, [localization])

  useEffect(() => {
    localStorage.setItem('settings_chartDefaults', JSON.stringify(chartDefaults))
  }, [chartDefaults])

  useEffect(() => {
    localStorage.setItem('settings_hotkeys', JSON.stringify(hotkeys))
  }, [hotkeys])

  useEffect(() => {
    localStorage.setItem('settings_widgetRefresh', JSON.stringify(widgetRefresh))
  }, [widgetRefresh])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!rebindingHotkey) return
      e.preventDefault()
      const mods: string[] = []
      if (e.ctrlKey) mods.push('Ctrl')
      if (e.altKey) mods.push('Alt')
      if (e.shiftKey) mods.push('Shift')
      if (e.metaKey) mods.push('Meta')
      const key = e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta' ? '' : e.key.toUpperCase()
      const combo = key ? [...mods, key].join('+') : mods.join('+')
      if (combo) {
        setHotkeys((h) => ({ ...h, [rebindingHotkey]: combo }))
      }
      setRebindingHotkey(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rebindingHotkey])

  useEffect(() => {
    if (configData) {
      setConfig(configData)
      originalRef.current = JSON.stringify(configData)
    }
  }, [configData])

  const isDirty = config != null && originalRef.current !== '' && JSON.stringify(config) !== originalRef.current

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
      originalRef.current = JSON.stringify(config)
    } catch (e) {
      setMessage((e as Error).message || 'Save failed')
    }
    setSaving(false)
  }

  const testProvider = async (provider: string) => {
    setProviderTesting((p) => ({ ...p, [provider]: 'testing' }))
    try {
      await api.post(`/config/providers/test/${provider}`)
      setProviderTesting((p) => ({ ...p, [provider]: 'success' }))
    } catch (e) {
      setProviderTesting((p) => ({ ...p, [provider]: 'failure' }))
      useToastStore.getState().addToast(`Provider test failed: ${(e as Error).message}`, 'error')
    }
  }

  const onKeyDownCapture = useCallback((e: React.KeyboardEvent) => {
    if (rebindingHotkey) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [rebindingHotkey])

  if (isLoading) return <Spinner label="Loading settings..." />

  return (
    <div className="space-y-6" onKeyDownCapture={onKeyDownCapture}>
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
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value as any)}
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

      <button
        onClick={() => setShowWorkspaceManager(true)}
        style={{ fontSize: 11, color: 'var(--accent-blue)', cursor: 'pointer' }}
        className="underline"
      >
        Manage Workspaces
      </button>
      {showWorkspaceManager && config && (
        <WorkspaceManager
          currentConfig={config}
          onLoadConfig={(c: any) => { setConfig(c); setShowWorkspaceManager(false) }}
          onClose={() => setShowWorkspaceManager(false)}
        />
      )}

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
                  } catch (e) {
                    setMessage((e as Error).message || 'Failed to save API key')
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
            <label className="block text-xs mb-1 text-secondary">Max Drawdown Before Kill Switch</label>
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
        <div className="mt-4 pt-3 border-t border-default" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>PORTFOLIO LIMITS</div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-xs mb-1 text-secondary">Max Sector %</label>
              <input
                type="number"
                value={(config as any)?.max_sector_pct ?? 30}
                onChange={(e) => update('max_sector_pct', parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
              />
              <span className="text-xs mt-0.5 text-muted">% in single sector</span>
            </div>
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

      <Card title="Data Refresh Per Widget">
        <div className="space-y-3">
          {WIDGETS.map((w) => (
            <div key={w} className="flex items-center gap-3">
              <label className="text-[11px] text-secondary font-mono-data w-20">{w}</label>
              <input
                type="range"
                min={1}
                max={60}
                value={widgetRefresh[w]}
                onChange={(e) => setWidgetRefresh((r: any) => ({ ...r, [w]: Number(e.target.value) }))}
                className="w-30"
              />
              <span className="text-[11px] text-primary font-mono-data min-w-[50px]">
                {widgetRefresh[w]}s
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Data Providers">
        <div className="space-y-3">
          {config?.data_providers && Object.entries(config.data_providers).map(([provider, enabled]) => (
            <div key={provider} className="flex items-center justify-between py-1">
              <span className="text-sm capitalize text-primary">{provider.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded" style={{
                  color: enabled ? 'var(--accent-green)' : 'var(--text-muted)',
                  background: enabled ? 'var(--accent-green)15' : 'var(--bg-hover)',
                }}>
                  {enabled ? 'Connected' : 'Not Configured'}
                </span>
                <button
                  onClick={() => testProvider(provider)}
                  disabled={providerTesting[provider] === 'testing'}
                  className="text-[10px] font-mono px-2 py-1 rounded-sm cursor-pointer"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {providerTesting[provider] === 'testing' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        width: 10, height: 10, border: '1.5px solid var(--border-color)',
                        borderTopColor: 'var(--accent-blue)', borderRadius: '50%',
                        display: 'inline-block', animation: 'spinner-rotate 0.6s linear infinite',
                      }} />
                      Testing
                    </span>
                  ) : (
                    'Test Connection'
                  )}
                </button>
                {providerTesting[provider] === 'success' && (
                  <span style={{ color: 'var(--accent-green)', fontSize: 14 }}>✔</span>
                )}
                {providerTesting[provider] === 'failure' && (
                  <span style={{ color: 'var(--accent-red)', fontSize: 14 }}>✘</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="LOCALIZATION">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-xs mb-1 text-secondary">Timezone</label>
            <select
              value={localization.timezone}
              onChange={(e) => setLocalization((l: any) => ({ ...l, timezone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">Locale</label>
            <select
              value={localization.locale}
              onChange={(e) => setLocalization((l: any) => ({ ...l, locale: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            >
              {LOCALE_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">Currency</label>
            <select
              value={localization.currency}
              onChange={(e) => setLocalization((l: any) => ({ ...l, currency: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">Decimal Places</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={4}
                value={localization.decimals}
                onChange={(e) => setLocalization((l: any) => ({ ...l, decimals: Number(e.target.value) }))}
                className="w-24"
              />
              <span className="text-sm text-primary">{localization.decimals}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="CHART DEFAULTS">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-xs mb-1 text-secondary">Default Layout</label>
            <select
              value={chartDefaults.layout}
              onChange={(e) => setChartDefaults((c: any) => ({ ...c, layout: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            >
              {CHART_LAYOUTS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1 text-secondary">Default Timeframe</label>
            <select
              value={chartDefaults.timeframe}
              onChange={(e) => setChartDefaults((c: any) => ({ ...c, timeframe: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            >
              {CHART_TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs mb-1 text-secondary">Default Indicators</label>
            <input
              type="text"
              value={chartDefaults.indicators}
              onChange={(e) => setChartDefaults((c: any) => ({ ...c, indicators: e.target.value }))}
              placeholder="SMA_20, EMA_50, RSI_14, MACD, BB_20_2, VWAP"
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] border border-default text-primary"
            />
            <span className="text-xs mt-0.5 text-muted">Comma-separated indicator names</span>
          </div>
        </div>
      </Card>

      <Card title="HOTKEYS">
        <div className="space-y-1">
          {Object.entries(hotkeys).map(([action, shortcut]) => (
            <div key={action} className="flex items-center justify-between py-1 px-2 rounded-sm" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-xs text-primary">{action}</span>
              <div className="flex items-center gap-2">
                {rebindingHotkey === action ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--accent-yellow)20', color: 'var(--accent-yellow)' }}>
                    Press keys...
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    {shortcut}
                  </span>
                )}
                <button
                  onClick={() => setRebindingHotkey(rebindingHotkey === action ? null : action)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-sm cursor-pointer"
                  style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--accent-blue)' }}
                >
                  {rebindingHotkey === action ? 'Cancel' : 'Rebind'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        {isDirty && (
          <span className="text-[10px] font-mono px-2 py-1 rounded-sm" style={{ background: 'var(--accent-yellow)20', color: 'var(--accent-yellow)' }}>
            UNSAVED CHANGES
          </span>
        )}
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className="text-sm font-medium px-5 py-2 rounded-lg transition-colors text-white"
          style={{ background: isDirty ? 'var(--accent-blue)' : 'var(--bg-hover)', opacity: saving ? 0.6 : 1, cursor: isDirty ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
