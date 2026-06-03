import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, Users } from 'lucide-react'

interface ChatMessage {
  id: string
  channel: 'team' | 'ai'
  sender: string
  text: string
  timestamp: number
}

interface TypingInfo {
  sender: string
  channel: 'team' | 'ai'
}

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/chat`

function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const AVATAR_COLORS = [
  'var(--accent-blue)', 'var(--accent-green)', 'var(--accent-yellow)',
  'var(--accent-red)', 'var(--accent-cyan)', 'var(--accent-orange)',
]

function getAvatarColor(sender: string): string {
  let hash = 0
  for (let i = 0; i < sender.length; i++) hash = sender.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function ChatPanel() {
  const [channel, setChannel] = useState<'team' | 'ai'>('team')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState<TypingInfo | null>(null)
  const [connected, setConnected] = useState(false)
  const [sender] = useState(() => `User_${Math.random().toString(36).slice(2, 6)}`)
  const wsRef = useRef<WebSocket | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredMessages = messages.filter((m) => m.channel === channel)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'message') {
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              channel: msg.channel,
              sender: msg.sender,
              text: msg.text,
              timestamp: msg.timestamp ?? Math.floor(Date.now() / 1000),
            },
          ])
        } else if (msg.type === 'typing') {
          setTyping({ sender: msg.sender, channel: msg.channel })
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
          typingTimerRef.current = setTimeout(() => setTyping(null), 3000)
        }
      } catch {}
    }

    ws.onclose = () => setConnected(false)
    ws.onerror = () => ws.close()

    return () => {
      ws.close()
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [filteredMessages.length, typing])

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({
      type: 'message',
      channel,
      sender,
      text,
    }))
    setInput('')
  }, [input, channel, sender])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        channel,
        sender,
      }))
    }
  }, [channel, sender])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setChannel('team')}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-sm cursor-pointer"
          style={{
            background: channel === 'team' ? 'var(--accent-blue)' : 'transparent',
            color: channel === 'team' ? '#000' : 'var(--text-muted)',
            border: 'none',
          }}
        >
          <Users size={11} />
          Team
        </button>
        <button
          onClick={() => setChannel('ai')}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-sm cursor-pointer"
          style={{
            background: channel === 'ai' ? 'var(--accent-green)' : 'transparent',
            color: channel === 'ai' ? '#000' : 'var(--text-muted)',
            border: 'none',
          }}
        >
          <Bot size={11} />
          AI
        </button>
        <div className="flex-1" />
        <span
          className="text-[8px] font-mono"
          style={{ color: connected ? 'var(--accent-green)' : 'var(--accent-red)' }}
        >
          {connected ? '\u25CF' : '\u25CB'}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {filteredMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-1">
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {channel === 'team' ? 'No team messages yet' : 'Ask the AI anything'}
            </span>
            <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
              {channel === 'team' ? 'Start a conversation...' : 'Type your question below'}
            </span>
          </div>
        )}
        {filteredMessages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-1.5 px-1.5 py-1 rounded-sm"
            style={{
              background: msg.sender === sender ? 'rgba(0,229,255,0.05)' : 'transparent',
            }}
          >
            <div
              className="flex items-center justify-center w-4 h-4 rounded-full shrink-0 text-[8px] font-bold"
              style={{ background: getAvatarColor(msg.sender), color: '#000' }}
            >
              {msg.sender[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold" style={{ color: getAvatarColor(msg.sender) }}>
                  {msg.sender}
                </span>
                <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div className="text-[10px] mt-0.5 leading-tight break-words" style={{ color: 'var(--text-primary)' }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {typing && typing.channel === channel && typing.sender !== sender && (
          <div className="flex items-center gap-1.5 px-1.5 py-1">
            <span className="text-[9px] italic" style={{ color: 'var(--text-muted)' }}>
              {typing.sender} typing...
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 p-1.5 border-t" style={{ borderTop: '1px solid var(--border-color)' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={channel === 'ai' ? 'Ask AI...' : 'Type a message...'}
          className="flex-1 px-2 py-1 text-[10px] font-mono rounded-sm outline-none"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !connected}
          className="flex items-center justify-center w-6 h-6 rounded-sm cursor-pointer disabled:opacity-40"
          style={{
            background: 'var(--accent-blue)',
            border: 'none',
            color: '#000',
          }}
        >
          <Send size={11} />
        </button>
      </div>
    </div>
  )
}
