import { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, MicOff, Command, X } from 'lucide-react'

interface VoiceCommand {
  command: string
  action: string
  confidence: number
  timestamp: number
}

const COMMANDS: Record<string, string> = {
  'buy': 'BUY',
  'sell': 'SELL',
  'go to dashboard': 'NAV_DASHBOARD',
  'go to chart': 'NAV_CHART',
  'go to portfolio': 'NAV_PORTFOLIO',
  'go to trades': 'NAV_TRADES',
  'refresh': 'REFRESH',
  'toggle theme': 'TOGGLE_THEME',
  'dark mode': 'DARK_MODE',
  'light mode': 'LIGHT_MODE',
  'show orders': 'SHOW_ORDERS',
  'show signals': 'SHOW_SIGNALS',
  'backtest': 'NAV_BACKTEST',
}

export default function VoiceCommandButton() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
        recognitionRef.current = null
      }
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final = event.results[i][0].transcript.toLowerCase().trim()
          }
        }
        if (final) {
          setTranscript(final)
          for (const [phrase, action] of Object.entries(COMMANDS)) {
            if (final.includes(phrase)) {
              const cmd: VoiceCommand = { command: phrase, action, confidence: 0.9, timestamp: Date.now() }
              setLastCommand(cmd)
              handleAction(action, final)
              break
            }
          }
        } else if (event.results.length > 0) {
          const latest = event.results[event.results.length - 1]
          if (!latest.isFinal) {
            setTranscript(latest[0].transcript.toLowerCase())
          }
        }
      }

      recognition.onerror = (event: any) => {
        setError(`Error: ${event.error}`)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      setError(null)
    } catch {
      setError('Failed to start')
    }
  }, [isListening])

  const handleAction = (action: string, text: string) => {
    if (action.startsWith('NAV_')) {
      const pathMap: Record<string, string> = {
        NAV_DASHBOARD: '/',
        NAV_CHART: '/markets/chart',
        NAV_PORTFOLIO: '/trading/portfolio',
        NAV_TRADES: '/trading/trades',
        NAV_BACKTEST: '/strategy/backtest',
      }
      const path = pathMap[action]
      if (path) window.location.hash = path
    } else if (action === 'BUY' || action === 'SELL') {
      const match = text.match(/(buy|sell)\s+(\d+)\s+([a-z]+)/i)
      if (match) {
        const [, side, qty, sym] = match
        setLastCommand({
          command: `${side} ${qty} ${sym.toUpperCase()}`,
          action: 'ORDER',
          confidence: 0.9,
          timestamp: Date.now(),
        })
      }
    }
    setShowPalette(true)
    setTimeout(() => setShowPalette(false), 3000)
  }

  return (
    <>
      <button
        onClick={toggleListening}
        className="relative flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono cursor-pointer border-none"
        style={{
          background: isListening ? 'rgba(239,68,68,0.15)' : 'transparent',
          color: isListening ? 'var(--accent-red)' : 'var(--text-muted)',
          border: '1px solid',
          borderColor: isListening ? 'var(--accent-red)' : 'var(--border-color)',
        }}
        title={isListening ? 'Stop listening' : 'Start voice commands'}
      >
        {isListening ? <MicOff size={12} /> : <Mic size={12} />}
        {isListening && <span className="animate-pulse">LISTENING</span>}
      </button>

      {showPalette && lastCommand && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-card border border-default rounded-lg shadow-lg p-3 max-w-xs"
          style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="flex items-start gap-2">
            <Command size={14} className="text-accent-blue shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-primary">Voice Command</div>
              <div className="text-[10px] text-muted mt-0.5 break-words">&ldquo;{lastCommand.command}&rdquo;</div>
            </div>
            <button onClick={() => setShowPalette(false)} className="text-muted hover:text-primary cursor-pointer bg-transparent border-none p-0">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  )
}
