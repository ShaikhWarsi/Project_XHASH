import { useState } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'

export default function MemoryLog() {
  const [agentId, setAgentId] = useState('default_agent')
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`)
  const [memory, setMemory] = useState<any>(null)
  const [sessions, setSessions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadMemory = async () => {
    setLoading(true); setError('')
    try {
      const r = await api.get(`/memory/get?agent_id=${agentId}&session_id=${sessionId}`)
      setMemory(r.data)
    } catch (e: any) {
      if (e?.response?.status === 404) {
        const r = await api.post(`/memory/create?agent_id=${agentId}&session_id=${sessionId}`)
        setMemory({ ...r.data, reflections: [], debate_history: [], symbol_analysis: {} })
      } else {
        setError(e?.response?.data?.detail || e.message)
      }
    }
    setLoading(false)
  }

  const loadSessions = async () => {
    try {
      const r = await api.get(`/memory/sessions?agent_id=${agentId}`)
      setSessions(r.data.sessions || [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load sessions')
    }
  }

  const addReflection = async () => {
    const content = prompt('Reflection content:')
    if (!content) return
    try {
      await api.post(`/memory/reflect?agent_id=${agentId}&session_id=${sessionId}&content=${encodeURIComponent(content)}`)
      loadMemory()
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to add reflection')
    }
  }

  const deleteMemory = async () => {
    if (!confirm('Delete this memory?')) return
    try {
      await api.post(`/memory/delete?agent_id=${agentId}&session_id=${sessionId}`)
      setMemory(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to delete memory')
    }
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">AGENT MEMORY LOG</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default flex-wrap">
        <input className="bg-card border border-default px-2 py-1 w-32 text-[11px]" value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="AGENT ID" />
        <input className="bg-card border border-default px-2 py-1 w-40 text-[11px]" value={sessionId} onChange={e => setSessionId(e.target.value)} placeholder="SESSION ID" />
        <button onClick={loadMemory} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer">LOAD</button>
        <button onClick={loadSessions} className="bg-card border border-default px-3 py-1 text-[11px] rounded cursor-pointer">SESSIONS</button>
      </div>
      {error && <div className="px-3 py-2 text-down text-[10px]">{error}</div>}
      {sessions.length > 0 && (
        <div className="px-3 py-1 border-b border-default flex gap-1 flex-wrap">
          {sessions.map(s => (
            <button key={s} onClick={() => { setSessionId(s); loadMemory() }} className="bg-card border border-default px-2 py-0.5 text-[10px] rounded cursor-pointer">{s}</button>
          ))}
        </div>
      )}
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Loading memory..." /></div>}
      {memory && (
        <div className="flex-1 overflow-auto p-3 space-y-2">
          <div className="flex gap-2 mb-2">
            <button onClick={addReflection} className="bg-accent-blue text-white px-2 py-0.5 text-[10px] rounded cursor-pointer">+ REFLECTION</button>
            <button onClick={deleteMemory} className="bg-down text-white px-2 py-0.5 text-[10px] rounded cursor-pointer">DELETE</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-card border border-default p-2 rounded">
              <span className="text-muted">Agent:</span> {memory.agent_id}
            </div>
            <div className="bg-card border border-default p-2 rounded">
              <span className="text-muted">Session:</span> {memory.session_id}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">REFLECTIONS ({memory.reflections?.length || 0})</div>
            {memory.reflections?.map((r: any, i: number) => (
              <div key={i} className="bg-card border border-default p-2 rounded mb-1 text-[10px]">{r.content || JSON.stringify(r)}</div>
            ))}
          </div>
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">SYMBOL ANALYSIS</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(memory.symbol_analysis || {}).map(([sym, data]: [string, any]) => (
                <div key={sym} className="bg-card border border-default p-2 rounded text-[10px]">
                  <span className="text-accent-blue">{sym}</span>
                  <pre className="text-muted text-[9px] mt-0.5">{JSON.stringify(data, null, 1)}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
