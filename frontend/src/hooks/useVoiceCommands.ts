import { useState, useEffect, useCallback, useRef } from 'react'

export interface VoiceCommand {
  command: string
  action: string
  confidence: number
  timestamp: number
}

export interface VoiceCommandsConfig {
  enabled: boolean
  language?: string
  continuous?: boolean
  interimResults?: boolean
}

type CommandHandler = (command: VoiceCommand) => void

const DEFAULT_COMMANDS: Record<string, string> = {
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
  'switch to paper trading': 'NAV_PAPER',
  'switch to live trading': 'NAV_LIVE',
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

export function useVoiceCommands(config: VoiceCommandsConfig = { enabled: false }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [commands, setCommands] = useState(DEFAULT_COMMANDS)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const handlerRef = useRef<CommandHandler | null>(null)
  const restartTimerRef = useRef<number | null>(null)

  const onCommand = useCallback((handler: CommandHandler) => {
    handlerRef.current = handler
  }, [])

  const addCommand = useCallback((phrase: string, action: string) => {
    setCommands(prev => ({ ...prev, [phrase.toLowerCase()]: action }))
  }, [])

  const removeCommand = useCallback((phrase: string) => {
    setCommands(prev => {
      const next = { ...prev }
      delete next[phrase.toLowerCase()]
      return next
    })
  }, [])

  const startListening = useCallback(() => {
    if (!config.enabled) return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser')
      return
    }

    try {
      const recognition = new SpeechRecognition() as SpeechRecognitionInstance
      recognition.continuous = config.continuous ?? true
      recognition.interimResults = config.interimResults ?? false
      recognition.lang = config.language ?? 'en-US'

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            const text = result[0].transcript.toLowerCase().trim()
            setTranscript(text)

            for (const [phrase, action] of Object.entries(commands)) {
              if (text.includes(phrase)) {
                const cmd: VoiceCommand = {
                  command: phrase,
                  action,
                  confidence: result[0].confidence,
                  timestamp: Date.now(),
                }
                setLastCommand(cmd)
                handlerRef.current?.(cmd)
                break
              }
            }
          }
        }
      }

      recognition.onerror = (event: any) => {
        setError(`Voice recognition error: ${event.error}`)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
        if (config.enabled && config.continuous) {
          restartTimerRef.current = window.setTimeout(() => {
            startListening()
          }, 500)
        }
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      setError(null)
    } catch (err) {
      setError('Failed to start voice recognition')
      setIsListening(false)
    }
  }, [config.enabled, config.continuous, config.interimResults, config.language, commands])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    setIsListening(false)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  useEffect(() => {
    if (config.enabled) {
      startListening()
    } else {
      stopListening()
    }
    return () => {
      stopListening()
    }
  }, [config.enabled, startListening, stopListening])

  return {
    isListening,
    transcript,
    lastCommand,
    error,
    startListening,
    stopListening,
    toggleListening,
    onCommand,
    addCommand,
    removeCommand,
    commands,
  }
}
