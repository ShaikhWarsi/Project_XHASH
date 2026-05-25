import { useEffect, useState } from 'react'
import Badge from './ui/Badge'
import { fetchIntegrations, toggleIntegration, testIntegration } from '../api/integrations'
import type { IntegrationStatus } from '../api/integrations'
import { useToastStore } from '../store/toast'

const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

export default function IntegrationsSettings() {
  const addToast = useToastStore((s) => s.addToast)
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    setLoading(true)
    try {
      const data = await fetchIntegrations()
      setIntegrations(data.integrations || [])
    } catch {
      setIntegrations([])
    }
    setLoading(false)
  }

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      await toggleIntegration(name, enabled)
      addToast(`${name} ${enabled ? 'enabled' : 'disabled'}`, 'success')
      loadIntegrations()
    } catch {
      addToast(`Failed to toggle ${name}`, 'error')
    }
  }

  const handleTest = async (name: string) => {
    try {
      const result = await testIntegration(name)
      addToast(`${name}: ${result.message}`, result.success ? 'success' : 'error')
    } catch {
      addToast(`${name}: connection failed`, 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '12px 0', ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center' }}>
        Loading integrations...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {integrations.length === 0 ? (
        <div style={{ padding: '12px 0', ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center' }}>
          No integrations configured
        </div>
      ) : (
        integrations.map((int) => (
          <div
            key={int.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <div style={{ ...FONT_SM, fontWeight: 600, color: 'var(--text-primary)' }}>
                {int.name.replace(/_/g, ' ')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Badge
                  label={int.enabled ? 'Enabled' : 'Disabled'}
                  variant={int.enabled ? 'success' : 'default'}
                  size="sm"
                />
                {int.connected && (
                  <Badge label="Connected" variant="info" size="sm" />
                )}
                {int.last_active && (
                  <span style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>
                    Last: {new Date(int.last_active).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => handleTest(int.name)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  padding: '2px 8px',
                  ...FONT_SM,
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                TEST
              </button>
              <button
                onClick={() => handleToggle(int.name, !int.enabled)}
                style={{
                  background: int.enabled ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  border: `1px solid ${int.enabled ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  color: int.enabled ? 'var(--accent-red)' : 'var(--accent-green)',
                  padding: '2px 8px',
                  ...FONT_SM,
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {int.enabled ? 'DISABLE' : 'ENABLE'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
