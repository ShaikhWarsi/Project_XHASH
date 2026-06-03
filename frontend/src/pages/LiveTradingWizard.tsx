import { useState } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useToastStore } from '../store/toast'
import { fmtCurrency } from '../utils/format'

type Step = 'welcome' | 'broker' | 'credentials' | 'review' | 'checklist' | 'done'

interface BrokerConfig {
  id: string
  name: string
  description: string
  docs: string
  fields: { key: string; label: string; type: string; placeholder: string }[]
}

type ChecklistKey = 'api_keys_saved' | 'risk_limits_configured' | 'kill_switch_enabled' | 'dry_run_verified'

const CHECKLIST_ITEMS: { key: ChecklistKey; label: string }[] = [
  { key: 'api_keys_saved', label: 'API keys saved' },
  { key: 'risk_limits_configured', label: 'Risk limits configured (max position %, max drawdown)' },
  { key: 'kill_switch_enabled', label: 'Kill switch enabled' },
  { key: 'dry_run_verified', label: 'Dry-run mode verified' },
]

const BROKERS: BrokerConfig[] = [
  {
    id: 'alpaca',
    name: 'Alpaca',
    description: 'Commission-free API trading. US stocks, ETFs, crypto. Paper trading available.',
    docs: 'https://alpaca.markets/docs/',
    fields: [
      { key: 'api_key', label: 'API Key ID', type: 'text', placeholder: 'PK1234567890' },
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: '••••••••••' },
      { key: 'paper', label: 'Paper Trading', type: 'checkbox', placeholder: '' },
    ],
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    description: 'Professional-grade brokerage. Stocks, options, futures, forex worldwide.',
    docs: 'https://www.interactivebrokers.com/api/doc.html',
    fields: [
      { key: 'account_id', label: 'Account ID', type: 'text', placeholder: 'U1234567' },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: '••••••••••' },
    ],
  },
  {
    id: 'ccxt',
    name: 'CCXT (Crypto)',
    description: '100+ crypto exchanges via unified CCXT API. Binance, Coinbase, Kraken, etc.',
    docs: 'https://docs.ccxt.com/',
    fields: [
      { key: 'exchange', label: 'Exchange', type: 'text', placeholder: 'binance' },
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: '••••••••••' },
      { key: 'secret', label: 'Secret', type: 'password', placeholder: '••••••••••' },
    ],
  },
]

export default function LiveTradingWizard() {
  const [step, setStep] = useState<Step>('welcome')
  const [selectedBroker, setSelectedBroker] = useState<BrokerConfig | null>(null)
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [riskLimit, setRiskLimit] = useState('5000')
  const [testing, setTesting] = useState(false)
  const [testnet, setTestnet] = useState(false)
  const [connected, setConnected] = useState(false)
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    api_keys_saved: false,
    risk_limits_configured: false,
    kill_switch_enabled: false,
    dry_run_verified: false,
  })
  const addToast = useToastStore((s) => s.addToast)

  const checkedCount = Object.values(checklist).filter(Boolean).length

  const handleConnect = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedBroker?.id, config: creds, testnet: testnet || undefined }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        addToast(`Connected to ${selectedBroker?.name} successfully`, 'success')
        setConnected(true)
        setStep('review')
      } else {
        addToast(data.message || 'Connection failed', 'error')
      }
    } catch {
      addToast('Connection test failed — check credentials', 'error')
    }
    setTesting(false)
  }

  const resetWizard = () => {
    setStep('welcome')
    setSelectedBroker(null)
    setCreds({})
    setRiskLimit('5000')
    setTestnet(false)
    setConnected(false)
    setChecklist({ api_keys_saved: false, risk_limits_configured: false, kill_switch_enabled: false, dry_run_verified: false })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {step === 'welcome' && (
        <>
          <Card title="GO LIVE">
            <div className="text-center py-6 space-y-3">
              <div className="text-3xl">🚀</div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Connect a Live Broker</h2>
              <p className="text-[10px] font-mono max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                Link your brokerage account to trade in real-time. Your API keys are stored locally and never shared.
              </p>
              <div className="flex items-center justify-center gap-2 text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <Badge label="Paper Trading Available" variant="info" size="sm" />
                <Badge label="Risk Limits Configurable" variant="warning" size="sm" />
              </div>
              <button
                onClick={() => setStep('broker')}
                className="px-5 py-2 text-xs font-mono font-bold rounded-sm cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                Get Started
              </button>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            {BROKERS.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-sm text-center cursor-pointer"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                }}
                onClick={() => { setSelectedBroker(b); setStep('credentials') }}
              >
                <div className="text-lg mb-1">
                  {b.id === 'alpaca' ? '🦙' : b.id === 'ibkr' ? '🏦' : '₿'}
                </div>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{b.description.slice(0, 60)}...</div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 'credentials' && selectedBroker && (
        <Card title={`CONNECT ${selectedBroker.name.toUpperCase()}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {selectedBroker.description}
              </p>
              {testnet && (
                <Badge label="TESTNET ACTIVE" variant="warning" size="sm" />
              )}
            </div>
            <a href={selectedBroker.docs} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono underline" style={{ color: 'var(--accent-blue)' }}>
              View API Documentation →
            </a>
            {selectedBroker.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-[10px] font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {field.label}
                </label>
                {field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-[10px] font-mono cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={creds[field.key] === 'true'}
                      onChange={(e) => setCreds((c) => ({ ...c, [field.key]: e.target.checked ? 'true' : 'false' }))}
                      style={{ accentColor: 'var(--accent-cyan)' }}
                    />
                    Enable paper trading
                  </label>
                ) : (
                  <input
                    type={field.type}
                    value={creds[field.key] || ''}
                    onChange={(e) => setCreds((c) => ({ ...c, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-2.5 py-1.5 text-[10px] font-mono outline-none rounded-sm"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--input-text)',
                    }}
                  />
                )}
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-mono mb-1" style={{ color: 'var(--text-secondary)' }}>
                Max Position Size ($)
              </label>
              <input
                type="number"
                value={riskLimit}
                onChange={(e) => setRiskLimit(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[10px] font-mono outline-none rounded-sm"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--input-text)',
                }}
              />
            </div>
            <div className="flex items-center gap-3 pt-1 pb-1 border-t border-default" style={{ borderColor: 'var(--border-color)' }}>
              <label className="flex items-center gap-2 text-[10px] font-mono cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={testnet}
                  onChange={(e) => setTestnet(e.target.checked)}
                  disabled={connected}
                  style={{ accentColor: 'var(--accent-orange)' }}
                />
                TESTNET MODE
              </label>
              {testnet && (
                <span className="text-[9px] font-mono" style={{ color: 'var(--accent-orange)' }}>
                  Using testnet/sandbox endpoints
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleConnect}
                disabled={testing}
                className="px-4 py-1.5 text-[10px] font-mono font-bold rounded-sm cursor-pointer"
                style={{
                  background: testing ? 'var(--bg-hover)' : 'var(--accent-green)',
                  color: testing ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                }}
              >
                {testing ? 'Testing...' : 'Test & Connect'}
              </button>
              <button
                onClick={() => setStep('broker')}
                className="px-4 py-1.5 text-[10px] font-mono rounded-sm cursor-pointer"
                style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              >
                Back
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 'review' && selectedBroker && (
        <Card title="REVIEW CONFIGURATION">
          <div className="space-y-3">
            <div className="text-[10px] font-mono space-y-1" style={{ color: 'var(--text-muted)' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Broker:</span> {selectedBroker.name}</div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Risk Limit:</span> {fmtCurrency(Number(riskLimit))}</div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Testnet:</span> {testnet ? 'Yes' : 'No'}</div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setStep('checklist')}
                className="px-4 py-1.5 text-[10px] font-mono font-bold rounded-sm cursor-pointer"
                style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}
              >
                Continue to Checklist
              </button>
              <button
                onClick={() => setStep('credentials')}
                className="px-4 py-1.5 text-[10px] font-mono rounded-sm cursor-pointer"
                style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              >
                Back
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 'checklist' && (
        <Card title="GO-LIVE CHECKLIST">
          <div className="space-y-3">
            <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Complete all items before going live.
            </p>
            <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
              Progress: {checkedCount}/{CHECKLIST_ITEMS.length} complete
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: 'var(--bg-hover)',
                  borderRadius: 2,
                  marginLeft: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%`,
                    height: '100%',
                    background: 'var(--accent-green)',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
            {CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 text-[10px] font-mono cursor-pointer"
                style={{
                  color: checklist[item.key] ? 'var(--accent-green)' : 'var(--text-primary)',
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: checklist[item.key] ? 'color-mix(in srgb, var(--accent-green) 8%, transparent)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={checklist[item.key]}
                  onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))}
                  style={{ accentColor: 'var(--accent-green)' }}
                />
                {item.label}
              </label>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setStep('done')}
                disabled={checkedCount < CHECKLIST_ITEMS.length}
                className="px-4 py-1.5 text-[10px] font-mono font-bold rounded-sm cursor-pointer"
                style={{
                  background: checkedCount < CHECKLIST_ITEMS.length ? 'var(--bg-hover)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: checkedCount < CHECKLIST_ITEMS.length ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                }}
              >
                Go Live
              </button>
              <button
                onClick={() => setStep('review')}
                className="px-4 py-1.5 text-[10px] font-mono rounded-sm cursor-pointer"
                style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              >
                Back
              </button>
            </div>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card title="CONNECTED">
          <div className="text-center py-6 space-y-3">
            <div className="text-3xl">✅</div>
            <h2 className="text-base font-bold" style={{ color: 'var(--accent-green)' }}>
              Connected to {selectedBroker?.name}
            </h2>
            <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Your broker is linked. Start with small positions and monitor risk.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge label="Connected" variant="success" />
              <Badge label={`Risk Limit: ${fmtCurrency(Number(riskLimit))}`} variant="info" />
              {testnet && <Badge label="Testnet" variant="warning" />}
            </div>
            <button
              onClick={resetWizard}
              className="px-4 py-1.5 text-[10px] font-mono font-bold rounded-sm cursor-pointer"
              style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}
            >
              Connect Another Broker
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
