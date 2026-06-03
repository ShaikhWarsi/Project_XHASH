import { useState } from 'react'

interface Props {
  dailyLoss: number
  dailyLimit: number
  onSetLimit: (limit: number) => void
  onKill: () => void
  active: boolean
}

export default function DailyLossKillSwitch({ dailyLoss, dailyLimit, onSetLimit, active, onKill }: Props) {
  const [editing, setEditing] = useState(false)
  const [inputLimit, setInputLimit] = useState(String(dailyLimit))

  const pctUsed = dailyLimit > 0 ? Math.min(Math.abs(dailyLoss) / dailyLimit * 100, 100) : 0
  const isTriggered = active && pctUsed >= 100

  const handleSave = () => {
    const val = Number(inputLimit)
    if (val > 0) {
      onSetLimit(val)
      setEditing(false)
    }
  }

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      background: isTriggered ? 'rgba(239,68,68,0.1)' : 'var(--bg-card, #0d1117)',
      border: `1px solid ${isTriggered ? '#ef4444' : 'var(--border-color, #1a2332)'}`,
      borderRadius: 6, padding: 8, width: 200,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: isTriggered ? '#ef4444' : 'var(--text-primary)', fontWeight: 600, fontSize: 8 }}>
          {isTriggered ? '🔴 KILL SWITCH TRIGGERED' : '🛡 Daily Loss Limit'}
        </span>
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)' }}>Today: <span style={{ color: dailyLoss < 0 ? '#ef4444' : '#22c55e' }}>${Math.abs(dailyLoss).toLocaleString()}</span></span>
          <span style={{ color: 'var(--text-muted)' }}>Limit: ${Number(dailyLimit).toLocaleString()}</span>
        </div>
        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${pctUsed}%`, height: '100%',
            background: isTriggered ? '#ef4444' : pctUsed > 80 ? '#f59e0b' : '#22c55e',
            borderRadius: 2, transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="number"
            value={inputLimit}
            onChange={e => setInputLimit(e.target.value)}
            style={{
              flex: 1, padding: '2px 6px', fontSize: 9,
              background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace',
              borderRadius: 3,
            }}
          />
          <button onClick={handleSave} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 8, cursor: 'pointer', background: 'var(--accent-blue)', border: 'none', color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>Set</button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            width: '100%', padding: '2px 6px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {dailyLimit > 0 ? 'Change Limit' : 'Set Limit'}
        </button>
      )}

      {isTriggered && (
        <button
          onClick={onKill}
          style={{
            width: '100%', marginTop: 4, padding: '4px 8px', borderRadius: 4, fontSize: 8, fontWeight: 700, cursor: 'pointer',
            background: '#ef4444', border: 'none', color: '#fff',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          CLOSE ALL & STOP TRADING
        </button>
      )}
    </div>
  )
}
