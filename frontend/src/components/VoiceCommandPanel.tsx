import { useState, useCallback, useEffect } from 'react'
import { useVoiceCommands } from '../hooks/useVoiceCommands'

interface Props {
  enabled?: boolean
  onNavigate?: (route: string) => void
  onBuy?: (symbol?: string) => void
  onSell?: (symbol?: string) => void
  onRefresh?: () => void
  onToggleTheme?: () => void
}

export default function VoiceCommandPanel({
  enabled = true,
  onNavigate,
  onBuy,
  onSell,
  onRefresh,
  onToggleTheme,
}: Props) {
  const [minimized, setMinimized] = useState(true)
  const [recentCommands, setRecentCommands] = useState<string[]>([])

  const config = { enabled, continuous: true, interimResults: false }

  const {
    isListening,
    transcript,
    lastCommand,
    error,
    toggleListening,
    onCommand,
  } = useVoiceCommands(config)

  useEffect(() => {
    if (lastCommand) {
      setRecentCommands(prev => [lastCommand.command, ...prev].slice(0, 10))
    }
  }, [lastCommand])

  const handleCommand = useCallback((cmd: { action: string; command: string }) => {
    switch (cmd.action) {
      case 'NAV_DASHBOARD': onNavigate?.('/'); break
      case 'NAV_CHART': onNavigate?.('/chart'); break
      case 'NAV_PORTFOLIO': onNavigate?.('/portfolio'); break
      case 'NAV_TRADES': onNavigate?.('/trades'); break
      case 'NAV_BACKTEST': onNavigate?.('/backtest'); break
      case 'NAV_PAPER': onNavigate?.('/paper-trading'); break
      case 'NAV_LIVE': onNavigate?.('/live-trading'); break
      case 'BUY': onBuy?.(); break
      case 'SELL': onSell?.(); break
      case 'REFRESH': onRefresh?.(); break
      case 'TOGGLE_THEME':
      case 'DARK_MODE':
      case 'LIGHT_MODE': onToggleTheme?.(); break
      case 'SHOW_ORDERS': onNavigate?.('/orders'); break
      case 'SHOW_SIGNALS': onNavigate?.('/signals'); break
    }
  }, [onNavigate, onBuy, onSell, onRefresh, onToggleTheme])

  onCommand(handleCommand)

  if (!enabled) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
    }}>
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          title={`Voice Commands ${isListening ? '(Active)' : '(Inactive)'}`}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: isListening ? 'var(--accent-green, #22c55e)' : 'var(--bg-card, #0d1117)',
            border: '1px solid var(--border-color, #1a2332)',
            color: isListening ? '#000' : 'var(--text-primary)',
            cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {isListening ? '🎤' : '🎙'}
        </button>
      ) : (
        <div style={{
          width: 280, background: 'var(--bg-card, #0d1117)',
          border: '1px solid var(--border-color, #1a2332)',
          borderRadius: 8, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              Voice Commands {isListening ? '🟢' : '🔴'}
            </span>
            <button
              onClick={() => setMinimized(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: 8, display: 'flex', gap: 4 }}>
            <button
              onClick={toggleListening}
              style={{
                flex: 1, padding: '4px 8px', borderRadius: 4,
                background: isListening ? '#ef4444' : '#22c55e',
                border: 'none', color: '#fff', cursor: 'pointer', fontSize: 9, fontWeight: 600,
              }}
            >
              {isListening ? 'STOP' : 'START'}
            </button>
          </div>

          {error && (
            <div style={{ color: '#ef4444', marginBottom: 4, fontSize: 9 }}>
              {error}
            </div>
          )}

          {transcript && (
            <div style={{
              padding: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4,
              marginBottom: 8, color: 'var(--text-secondary)', fontSize: 9, minHeight: 20,
            }}>
              "{transcript}"
            </div>
          )}

          {recentCommands.length > 0 && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8, marginBottom: 4 }}>Recent Commands</div>
              {recentCommands.map((cmd, i) => (
                <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 9, padding: '1px 0' }}>
                  › {cmd}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
