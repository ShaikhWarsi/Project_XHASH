import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { FlaskConical, Search, Plus } from 'lucide-react'
import Spinner from '../components/Spinner'

interface Hypothesis {
  hypothesis_id: string
  title: string
  thesis: string
  status: string
  universe: string
  signal_definition: string
  data_sources: string[]
  run_cards: any[]
  backtest_results: any[]
  created_at: string
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  exploring: '#f59e0b',
  testing: '#3b82f6',
  validated: '#22c55e',
  rejected: '#ef4444',
  monitoring: '#8b5cf6',
}

export default function HypothesisLab() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedH, setSelectedH] = useState<Hypothesis | null>(null)

  // create form
  const [title, setTitle] = useState('')
  const [thesis, setThesis] = useState('')
  const [universe, setUniverse] = useState('')
  const [signalDef, setSignalDef] = useState('')

  const fetchHypotheses = async () => {
    try {
      const params: any = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const r = await api.get('/hypotheses/', { params })
      setHypotheses(r.data.hypotheses || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchHypotheses() }, [search, statusFilter])

  const createHypothesis = async () => {
    if (!title.trim() || !thesis.trim()) return
    try {
      await api.post('/hypotheses/', { title, thesis, universe, signal_definition: signalDef })
      setTitle('')
      setThesis('')
      setUniverse('')
      setSignalDef('')
      setShowCreate(false)
      fetchHypotheses()
    } catch { }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/hypotheses/${id}`, { status })
      fetchHypotheses()
      if (selectedH?.hypothesis_id === id) {
        const r = await api.get(`/hypotheses/${id}`)
        setSelectedH(r.data)
      }
    } catch { }
  }

  const deleteHypothesis = async (id: string) => {
    try {
      await api.delete(`/hypotheses/${id}`)
      if (selectedH?.hypothesis_id === id) setSelectedH(null)
      fetchHypotheses()
    } catch { }
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <FlaskConical size={12} /><span className="font-bold text-sm">HYPOTHESIS LAB</span>
        <span className="text-muted">|</span>
        <div className="flex items-center gap-1 bg-card border border-default px-1.5 py-0.5 rounded-sm">
          <Search size={10} className="text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent border-none text-primary text-[10px] font-mono-data w-[120px] outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-card border border-default text-primary text-[9px] px-1 py-0.5">
          <option value="">All</option>
          <option value="exploring">Exploring</option>
          <option value="testing">Testing</option>
          <option value="validated">Validated</option>
          <option value="rejected">Rejected</option>
          <option value="monitoring">Monitoring</option>
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-500 border-none text-white cursor-pointer px-2 py-0.5 text-[9px] rounded-sm">
          <Plus size={10} className="mr-1" />HYPOTHESIS
        </button>
      </div>

      {showCreate && (
        <div className="p-2 border-b border-default bg-card">
          <div className="flex gap-1.5 flex-wrap">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title *" className="bg-[var(--bg-app)] border border-default text-primary px-2 py-1 text-[10px] font-mono-data flex-1" />
            <input value={universe} onChange={(e) => setUniverse(e.target.value)} placeholder="Universe (e.g. SP500)" className="bg-[var(--bg-app)] border border-default text-primary px-2 py-1 text-[10px] font-mono-data w-[150px]" />
            <input value={signalDef} onChange={(e) => setSignalDef(e.target.value)} placeholder="Signal definition" className="bg-[var(--bg-app)] border border-default text-primary px-2 py-1 text-[10px] font-mono-data w-[200px]" />
          </div>
          <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder="Thesis *" rows={3} className="w-full mt-1 bg-[var(--bg-app)] border border-default text-primary px-2 py-1 text-[10px] font-mono-data resize-y" />
          <div className="flex gap-1 mt-1">
            <button onClick={createHypothesis} disabled={!title.trim() || !thesis.trim()} className="bg-green-500 border-none text-white cursor-pointer px-3 py-0.5 text-[9px] rounded-sm" style={{ opacity: !title.trim() || !thesis.trim() ? 0.5 : 1 }}>CREATE</button>
            <button onClick={() => setShowCreate(false)} className="bg-transparent border border-default text-muted cursor-pointer px-3 py-0.5 text-[9px] rounded-sm">CANCEL</button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-default overflow-auto">
          {loading ? (
            <Spinner label="Loading hypotheses..." />
          ) : hypotheses.length === 0 ? (
            <div className="p-3 text-muted text-[10px]">No hypotheses yet. Create one to start.</div>
          ) : (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="text-muted border-b border-default">
                  <th className="px-1.5 py-1 text-left">Status</th>
                  <th className="px-1.5 py-1 text-left">Title</th>
                  <th className="px-1.5 py-1 text-left">Universe</th>
                  <th className="px-1.5 py-1 text-left">Backtests</th>
                  <th className="px-1.5 py-1 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {hypotheses.map((h) => (
                  <tr key={h.hypothesis_id} onClick={() => setSelectedH(h)}
                    className="border-b border-[rgba(26,35,50,0.3)] cursor-pointer"
                    style={{ background: selectedH?.hypothesis_id === h.hypothesis_id ? 'rgba(59,130,246,0.1)' : 'transparent' }}>
                    <td className="px-1.5 py-0.5">
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: STATUS_COLORS[h.status] || '#5d6b7e' }} />
                      {h.status}
                    </td>
                    <td className="px-1.5 py-0.5 font-semibold">{h.title}</td>
                    <td className="px-1.5 py-0.5 text-muted">{h.universe || '-'}</td>
                    <td className="px-1.5 py-0.5">{h.backtest_results?.length || 0}</td>
                    <td className="px-1.5 py-0.5 text-muted text-[9px]">{h.created_at ? new Date(h.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {selectedH ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[14px] font-bold">{selectedH.title}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-sm" style={{ background: (STATUS_COLORS[selectedH.status] || '#5d6b7e') + '22', color: STATUS_COLORS[selectedH.status] || '#5d6b7e', border: '1px solid ' + (STATUS_COLORS[selectedH.status] || '#5d6b7e') }}>
                  {selectedH.status}
                </span>
              </div>
              <div className="text-[10px] text-muted mb-2 whitespace-pre-wrap">{selectedH.thesis}</div>

              <div className="flex gap-1 flex-wrap mb-2">
                {['exploring', 'testing', 'validated', 'rejected', 'monitoring'].map((s) => (
                  <button key={s} onClick={() => updateStatus(selectedH.hypothesis_id, s)}
                    className="cursor-pointer px-1.5 py-px text-[9px] rounded-sm"
                    style={{
                      background: selectedH.status === s ? (STATUS_COLORS[s] || '#5d6b7e') + '33' : 'transparent',
                      border: '1px solid ' + (STATUS_COLORS[s] || '#5d6b7e'),
                      color: STATUS_COLORS[s] || '#5d6b7e',
                    }}>
                    {s}
                  </button>
                ))}
                <div className="flex-1" />
                <button onClick={() => deleteHypothesis(selectedH.hypothesis_id)} className="bg-transparent border border-red-500 text-red-500 cursor-pointer px-1.5 py-px text-[9px] rounded-sm">
                  DELETE
                </button>
              </div>

              {selectedH.universe && <div className="text-[9px] text-muted mb-1">Universe: <span className="text-blue-500">{selectedH.universe}</span></div>}
              {selectedH.signal_definition && <div className="text-[9px] text-muted mb-1">Signal: <span className="text-blue-500">{selectedH.signal_definition}</span></div>}

              {selectedH.backtest_results && selectedH.backtest_results.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-muted mb-1">BACKTEST RESULTS</div>
                  {selectedH.backtest_results.map((r: any, i: number) => (
                    <div key={i} className="bg-card border border-default px-2 py-1.5 rounded mb-1 text-[9px]">
                      {Object.entries(r).map(([k, v]) => (
                        <div key={k} className="flex gap-1">
                          <span className="text-muted">{k}:</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {selectedH.run_cards && selectedH.run_cards.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-muted mb-1">LINKED RUNS</div>
                  {selectedH.run_cards.map((rc: any, i: number) => (
                    <div key={i} className="bg-card border border-default px-2 py-1.5 rounded mb-1 text-[9px]">
                      <div className="text-blue-500">{rc.run_card_path || rc.backtest_run_dir || `Run #${i + 1}`}</div>
                      {rc.metrics && <div className="text-muted mt-0.5">{JSON.stringify(rc.metrics)}</div>}
                      {rc.notes && <div className="text-[#8b95a5] mt-0.5">{rc.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-[10px]">
              Select a hypothesis to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
