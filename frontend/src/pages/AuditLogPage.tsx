import Breadcrumbs from '../components/Breadcrumbs'
import AuditLog from '../components/AuditLog'

const DEMO_LOGS = [
  { id: 'log-001', action: 'LOGIN', timestamp: '2026-05-25T08:00:00Z', details: 'User admin logged in from 192.168.1.1', user: 'admin' },
  { id: 'log-002', action: 'CREATE', timestamp: '2026-05-25T08:05:12Z', details: 'Strategy "Momentum v3" created', user: 'admin' },
  { id: 'log-003', action: 'UPDATE', timestamp: '2026-05-25T08:10:33Z', details: 'Risk limits updated: max_drawdown set to 20%', user: 'admin' },
  { id: 'log-004', action: 'EXECUTE', timestamp: '2026-05-25T08:15:45Z', details: 'Backtest run for strategy "Momentum v3" on BTC/USDT', user: 'system' },
  { id: 'log-005', action: 'APPROVE', timestamp: '2026-05-25T08:20:18Z', details: 'Trade approval for SELL 0.5 BTC at $68,420', user: 'admin' },
  { id: 'log-006', action: 'EXECUTE', timestamp: '2026-05-25T08:21:00Z', details: 'Order executed: SELL 0.5 BTC @ $68,420', user: 'system' },
  { id: 'log-007', action: 'CREATE', timestamp: '2026-05-25T08:30:00Z', details: 'Alert created: BTC price above $70k', user: 'admin' },
  { id: 'log-008', action: 'UPDATE', timestamp: '2026-05-25T08:35:22Z', details: 'Portfolio rebalancing triggered', user: 'system' },
  { id: 'log-009', action: 'REJECT', timestamp: '2026-05-25T08:40:11Z', details: 'Order rejected: insufficient margin for BUY 2 ETH', user: 'system' },
  { id: 'log-010', action: 'LOGOUT', timestamp: '2026-05-25T08:45:00Z', details: 'User admin logged out', user: 'admin' },
  { id: 'log-011', action: 'CREATE', timestamp: '2026-05-25T09:00:00Z', details: 'New watchlist "DeFi Tokens" created', user: 'admin' },
  { id: 'log-012', action: 'UPDATE', timestamp: '2026-05-25T09:15:30Z', details: 'Strategy parameter changed: rsi_period 14 -> 21', user: 'admin' },
  { id: 'log-013', action: 'EXECUTE', timestamp: '2026-05-25T09:20:00Z', details: 'Signal generated: BUY signal for SOL/USDT (strength: 0.82)', user: 'system' },
  { id: 'log-014', action: 'CANCEL', timestamp: '2026-05-25T09:25:45Z', details: 'Order cancelled: BUY 1 SOL @ $145.00', user: 'admin' },
  { id: 'log-015', action: 'DELETE', timestamp: '2026-05-25T09:30:00Z', details: 'Old backtest results purged (47 records)', user: 'system' },
]

export default function AuditLogPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <AuditLog logs={DEMO_LOGS} />
    </div>
  )
}
