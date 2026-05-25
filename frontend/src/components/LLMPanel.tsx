import { useEffect, useState, useRef, useCallback } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Skeleton from './Skeleton'
import { fetchLLMModels, llmComplete } from '../api/llm'
import type { LLMModel } from '../api/llm'
import { useToastStore } from '../store/toast'

const TEXT_SM = "font-mono-data text-[10px]"

interface Message {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  model?: string
}

const MAX_HISTORY = 20

export default function LLMPanel() {
  const addToast = useToastStore((s) => s.addToast)
  const [models, setModels] = useState<LLMModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [temperature, setTemperature] = useState(0.7)
  const [showSettings, setShowSettings] = useState(false)
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetchLLMModels()
      .then((res) => {
        setModels(res.models)
        if (res.models.length > 0) setSelectedModel(res.models[0].id)
      })
      .catch((err: any) => setError(err?.message || 'Failed to load models'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!selectedModel || !prompt.trim()) return
    const userMsg: Message = { role: 'user', content: prompt.trim(), model: selectedModel }
    setMessages((prev) => [...prev, userMsg].slice(-MAX_HISTORY))
    setPrompt('')
    setSending(true)

    try {
      const res = await llmComplete(selectedModel, prompt, { reasoning: true, temperature })
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.content,
        reasoning: res.reasoning,
        model: selectedModel,
      }
      setMessages((prev) => [...prev, assistantMsg].slice(-MAX_HISTORY))
    } catch (err: any) {
      addToast(err?.message || 'LLM request failed', 'error')
    }
    setSending(false)
  }, [selectedModel, prompt, temperature, addToast])

  const clearHistory = () => {
    setMessages([])
    addToast('Conversation cleared', 'info')
  }

  if (loading) {
    return (
      <Card title="LLM CAPABILITIES">
        <Skeleton width={120} height={14} />
        <div className="mt-2"><Skeleton width="100%" height={60} /></div>
      </Card>
    )
  }

  if (error && models.length === 0) {
    return (
      <Card title="LLM CAPABILITIES">
        <div className={TEXT_SM + " text-down py-2"}>{error}</div>
      </Card>
    )
  }

  return (
    <Card
      title={`LLM CAPABILITIES (${models.length} models)`}
      actions={
        <div className="flex gap-1">
          {messages.length > 0 && (
            <button onClick={clearHistory} className="bg-transparent border border-default text-muted font-mono-data text-[10px] px-2 py-0.5 cursor-pointer rounded-sm">
              CLEAR
            </button>
          )}
          <button onClick={() => setShowSettings(!showSettings)}
            className="border border-default text-muted font-mono-data text-[10px] px-2 py-0.5 cursor-pointer rounded-sm"
            style={{ background: showSettings ? 'var(--bg-hover)' : 'transparent' }}>
            SETTINGS
          </button>
        </div>
      }
    >
      {showSettings && (
        <div className="mb-2 p-1.5 bg-hover rounded-sm">
          <div className="flex items-center gap-2">
            <span className={TEXT_SM + " text-muted"}>Temp: {temperature.toFixed(1)}</span>
            <input
              type="range" min="0" max="2" step="0.1" value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="flex-1"
              style={{ accentColor: 'var(--accent-cyan)' }}
            />
          </div>
        </div>
      )}

      {models.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {models.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className="px-2 py-1 rounded-sm cursor-pointer"
              style={{
                background: selectedModel === m.id ? 'rgba(59,130,246,0.2)' : 'var(--bg-hover)',
                border: selectedModel === m.id ? '1px solid var(--accent-blue)' : '1px solid transparent',
              }}
            >
              <div className={TEXT_SM + " font-semibold"} style={{ color: selectedModel === m.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>{m.name}</div>
              <div className="flex gap-0.5 flex-wrap mt-0.5">
                {m.capabilities.map((cap) => (
                  <Badge key={cap} label={cap} variant="info" size="sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={responseRef} className="max-h-[300px] overflow-y-auto mb-1.5">
        {messages.length === 0 && (
          <div className={TEXT_SM + " text-muted text-center py-3"}>
            Send a message to start a conversation
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="mb-1.5">
            <div className={TEXT_SM + " font-bold mb-0.5"} style={{ color: msg.role === 'user' ? 'var(--accent-cyan)' : 'var(--accent-green)' }}>
              {msg.role === 'user' ? '> YOU' : `> ${msg.model || 'ASSISTANT'}`}
            </div>
            {msg.reasoning && (
              <div className="bg-hover border border-default rounded-sm p-1 mb-0.5 font-mono-data text-[10px] text-accent-cyan max-h-20 overflow-y-auto whitespace-pre-wrap opacity-80">
                <div className="font-semibold text-muted mb-0.5 text-[8px] tracking-wider">REASONING</div>
                {msg.reasoning}
              </div>
            )}
            <div className={TEXT_SM + " text-primary whitespace-pre-wrap py-0.5"}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className={TEXT_SM + " text-muted italic"}>Thinking...</div>
        )}
      </div>

      <div className="flex gap-1">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Enter prompt..."
          className="flex-1 bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !prompt.trim() || !selectedModel}
          className="text-white border-none font-mono-data text-[10px] font-semibold px-3 py-1 rounded-sm"
          style={{
            background: 'var(--accent-blue)',
            cursor: sending || !prompt.trim() || !selectedModel ? 'not-allowed' : 'pointer',
            opacity: sending || !prompt.trim() || !selectedModel ? 0.6 : 1,
          }}
        >
          {sending ? '...' : 'SEND'}
        </button>
      </div>
    </Card>
  )
}
