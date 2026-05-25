import { useEffect, useState, useRef, useCallback } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Skeleton from './Skeleton'
import { fetchLLMModels, llmComplete } from '../api/llm'
import type { LLMModel } from '../api/llm'
import { useToastStore } from '../store/toast'

const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }

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
        <div style={{ marginTop: 8 }}><Skeleton width="100%" height={60} /></div>
      </Card>
    )
  }

  if (error && models.length === 0) {
    return (
      <Card title="LLM CAPABILITIES">
        <div style={{ ...FONT_SM, color: 'var(--accent-red)', padding: '8px 0' }}>{error}</div>
      </Card>
    )
  }

  return (
    <Card
      title={`LLM CAPABILITIES (${models.length} models)`}
      actions={
        <div style={{ display: 'flex', gap: 4 }}>
          {messages.length > 0 && (
            <button onClick={clearHistory} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', ...FONT_SM, padding: '2px 8px', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>
              CLEAR
            </button>
          )}
          <button onClick={() => setShowSettings(!showSettings)} style={{ background: showSettings ? 'var(--bg-hover)' : 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', ...FONT_SM, padding: '2px 8px', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}>
            SETTINGS
          </button>
        </div>
      }
    >
      {showSettings && (
        <div style={{ marginBottom: 8, padding: 6, background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...FONT_SM, color: 'var(--text-muted)' }}>Temp: {temperature.toFixed(1)}</span>
            <input
              type="range" min="0" max="2" step="0.1" value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent-cyan)' }}
            />
          </div>
        </div>
      )}

      {models.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {models.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              style={{
                padding: '4px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: selectedModel === m.id ? 'rgba(59,130,246,0.2)' : 'var(--bg-hover)',
                border: selectedModel === m.id ? '1px solid var(--accent-blue)' : '1px solid transparent',
              }}
            >
              <div style={{ ...FONT_SM, fontWeight: 600, color: selectedModel === m.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>{m.name}</div>
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2 }}>
                {m.capabilities.map((cap) => (
                  <Badge key={cap} label={cap} variant="info" size="sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={responseRef} style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 6 }}>
        {messages.length === 0 && (
          <div style={{ ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
            Send a message to start a conversation
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ ...FONT_SM, fontWeight: 700, color: msg.role === 'user' ? 'var(--accent-cyan)' : 'var(--accent-green)', marginBottom: 2 }}>
              {msg.role === 'user' ? '> YOU' : `> ${msg.model || 'ASSISTANT'}`}
            </div>
            {msg.reasoning && (
              <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', marginBottom: 2, ...FONT_SM, color: 'var(--accent-cyan)', maxHeight: 80, overflowY: 'auto', whiteSpace: 'pre-wrap', opacity: 0.8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2, fontSize: 8, letterSpacing: '0.05em' }}>REASONING</div>
                {msg.reasoning}
              </div>
            )}
            <div style={{ ...FONT_SM, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', padding: '2px 0' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ ...FONT_SM, color: 'var(--text-muted)', fontStyle: 'italic' }}>Thinking...</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Enter prompt..."
          style={{
            flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
            color: 'var(--input-text)', ...FONT_SM, padding: '4px 8px', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !prompt.trim() || !selectedModel}
          style={{
            background: 'var(--accent-blue)', color: '#fff', border: 'none', ...FONT_SM, fontWeight: 600,
            padding: '4px 14px', cursor: sending || !prompt.trim() || !selectedModel ? 'not-allowed' : 'pointer',
            opacity: sending || !prompt.trim() || !selectedModel ? 0.6 : 1, borderRadius: 'var(--radius-sm)',
          }}
        >
          {sending ? '...' : 'SEND'}
        </button>
      </div>
    </Card>
  )
}
