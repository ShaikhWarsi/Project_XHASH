import { useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { useToastStore } from '../store/toast'
import { useNavigate } from 'react-router-dom'
import { Copy, ExternalLink, Activity, Settings, BarChart3, LineChart } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export default function WebhookBridges() {
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const [tvStatus] = useState<'connected' | 'disconnected'>('connected')
  const [gcStatus] = useState<'connected' | 'disconnected'>('connected')

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    addToast('URL copied to clipboard', 'success')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
        <Activity size={12} className="inline mr-1" /> Webhook Bridges
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>ChartInk</span>
              </div>
              <Badge label="Active" variant="success" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>Webhook URL</span>
              <div className="flex items-center gap-1">
                <code className="text-[9px] font-mono flex-1 truncate" style={{ color: 'var(--accent-cyan)', background: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '2px' }}>
                  {API_BASE}/openalgo/chartink/webhook
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyUrl(`${window.location.origin}${API_BASE}/openalgo/chartink/webhook`)}><Copy size={10} /></Button>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/chartink')}><Settings size={10} /> Strategies</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/chartink/symbols')}><ExternalLink size={10} /> Symbols</Button>
            </div>
            <div className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Format: {'{"strategy": "...", "symbol": "SBIN", "action": "BUY", "exchange": "NSE"}'}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart size={14} style={{ color: 'var(--accent-green)' }} />
                <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>TradingView</span>
              </div>
              <Badge label={tvStatus === 'connected' ? 'Active' : 'Inactive'} variant={tvStatus === 'connected' ? 'success' : 'default'} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>Webhook URL</span>
              <div className="flex items-center gap-1">
                <code className="text-[9px] font-mono flex-1 truncate" style={{ color: 'var(--accent-green)', background: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '2px' }}>
                  {API_BASE}/openalgo/tradingview/webhook
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyUrl(`${window.location.origin}${API_BASE}/openalgo/tradingview/webhook`)}><Copy size={10} /></Button>
              </div>
            </div>
            <div className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Format: {'{"passphrase": "SECRET", "action": "buy", "symbol": "NSE:SBIN", "orderType": "MARKET", "quantity": "100"}'}
            </div>
            <div className="text-[8px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              Set TV_WEBHOOK_PASSPHRASE env var for security
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: 'var(--accent-purple)' }} />
                <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>GoCharting</span>
              </div>
              <Badge label={gcStatus === 'connected' ? 'Active' : 'Inactive'} variant={gcStatus === 'connected' ? 'success' : 'default'} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>Webhook URL</span>
              <div className="flex items-center gap-1">
                <code className="text-[9px] font-mono flex-1 truncate" style={{ color: 'var(--accent-purple)', background: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '2px' }}>
                  {API_BASE}/openalgo/gocharting/webhook
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyUrl(`${window.location.origin}${API_BASE}/openalgo/gocharting/webhook`)}><Copy size={10} /></Button>
              </div>
            </div>
            <div className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Format: {'{"api_key": "...", "symbol": "SBIN", "exchange": "NSE", "action": "BUY", "quantity": "100"}'}
            </div>
            <div className="text-[8px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              Set GOCHARTING_WEBHOOK_API_KEY env var for security
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
