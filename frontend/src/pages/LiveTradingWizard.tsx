import { useState } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useToastStore } from '../store/toast'

type Step = 'welcome' | 'broker' | 'credentials' | 'review' | 'done'

interface BrokerConfig {
  id: string
  name: string
  description: string
  docs: string
  fields: { key: string; label: string; type: string; placeholder: string }[]
}

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
  const addToast = useToastStore((s) => s.addToast)

  const handleConnect = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedBroker?.id, config: creds }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        addToast(`Connected to ${selectedBroker?.name} successfully`, 'success')
        setStep('done')
      } else {
        addToast(data.message || 'Connection failed', 'error')
      }
    } catch {
      addToast('Connection test failed — check credentials', 'error')
    }
    setTesting(false)
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
            <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {selectedBroker.description}
            </p>
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
              <Badge label={`Risk Limit: $${Number(riskLimit).toLocaleString()}`} variant="info" />
            </div>
            <button
              onClick={() => { setStep('welcome'); setSelectedBroker(null); setCreds({}) }}
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
