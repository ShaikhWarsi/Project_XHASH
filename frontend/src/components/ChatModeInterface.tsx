import { useState, useRef, useEffect } from 'react'
import { Send, Terminal, Trash2 } from 'lucide-react'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const INITIAL_MESSAGES: Message[] = [
  { role: 'assistant', content: 'Terminal chat mode active. Ask me anything about markets, strategies, or data.', timestamp: new Date() },
]

export default function ChatModeInterface() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const { toggleMode } = useInterfaceMode()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    setTimeout(() => {
      const reply: Message = {
        role: 'assistant',
        content: `[Simulated response] Processing: "${userMsg.content}". Connect a real LLM backend to enable live responses.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, reply])
      setLoading(false)
    }, 800)
  }

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES)
  }

  return (
    <div
      className="flex-1 flex flex-col"
      style={{
        background: 'var(--bg-primary)',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 'var(--menubar-height)',
          padding: '0 12px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={11} style={{ color: 'var(--accent-green)' }} />
          <span style={{ color: 'var(--accent-green)', fontSize: 10, fontWeight: 600 }}>CHAT MODE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              borderRadius: 2,
            }}
          >
            <Trash2 size={9} /> Clear
          </button>
          <button
            onClick={toggleMode}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              borderRadius: 2,
            }}
          >
            <Terminal size={9} /> Terminal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-3 mb-4" style={{ animation: 'fade-in 0.2s ease' }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 700,
                color: '#000',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {msg.role === 'user' ? 'U' : 'A'}
            </div>
            <div className="flex-1">
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  marginBottom: 2,
                }}
              >
                {msg.role === 'user' ? 'You' : 'Assistant'} · {msg.timestamp.toLocaleTimeString()}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: 10, padding: '4px 0' }}>
            <span style={{ animation: 'cursor-blink 1s step-end infinite' }}>▌</span>
            Processing...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a command or question..."
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '6px 10px',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            outline: 'none',
            borderRadius: 2,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            background: 'var(--accent-green)',
            border: 'none',
            color: '#000',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            opacity: input.trim() && !loading ? 1 : 0.4,
            borderRadius: 2,
          }}
        >
          <Send size={11} /> Send
        </button>
      </div>
    </div>
  )
}
