import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Brain, Search, ChevronDown, ChevronRight } from 'lucide-react'

export default function ReasoningTrace() {
  const [traceInput, setTraceInput] = useState('')
  const [parsed, setParsed] = useState<any>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const handleParse = useCallback(() => {
    if (!traceInput.trim()) return
    try { setParsed(JSON.parse(traceInput)) }
    catch { setParsed({ raw: traceInput, _unparseable: true }) }
  }, [traceInput])

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  const renderValue = (val: any, path: string, depth: number = 0): any => {
    if (val === null || val === undefined) return <span className="text-muted">null</span>
    if (typeof val === 'boolean') return <Badge label={String(val)} variant={val ? 'success' : 'error'} />
    if (typeof val === 'number') return <span className="font-mono text-accent-blue">{val.toFixed(4)}</span>
    if (typeof val === 'string') {
      if (val.length > 120) return <span className="text-xs text-primary break-words">{val.slice(0, 120)}...</span>
      return <span className="text-xs text-primary">{val}</span>
    }
    if (Array.isArray(val)) {
      const isOpen = expanded[path] ?? depth < 1
      return (
        <div className="ml-2">
          <button onClick={() => toggle(path)} className="flex items-center gap-1 text-[10px] text-muted cursor-pointer bg-transparent border-none p-0">
            {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Array[{val.length}]
          </button>
          {isOpen && <div className="border-l border-default pl-2 mt-0.5 space-y-0.5">{val.map((v, i) => <div key={i} className="text-xs"><span className="text-muted mr-1">[{i}]:</span>{renderValue(v, `${path}[${i}]`, depth + 1)}</div>)}</div>}
        </div>
      )
    }
    if (typeof val === 'object') {
      const isOpen = expanded[path] ?? depth < 1
      const entries = Object.entries(val)
      return (
        <div className="ml-2">
          <button onClick={() => toggle(path)} className="flex items-center gap-1 text-[10px] text-muted cursor-pointer bg-transparent border-none p-0">
            {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {'{'}Object({entries.length}){'}'}
          </button>
          {isOpen && <div className="border-l border-default pl-2 mt-0.5 space-y-0.5">{entries.map(([k, v]) => <div key={k} className="text-xs"><span className="text-accent-blue mr-1">{k}:</span>{renderValue(v, `${path}.${k}`, depth + 1)}</div>)}</div>}
        </div>
      )
    }
    return <span className="text-xs">{String(val)}</span>
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Brain size={20} /> Reasoning Trace</h1>
      <p className="text-sm text-muted">Inspect the full reasoning chain of AI agents — see exactly which data points and logic each agent used to reach its conclusion.</p>

      <Card title="Agent Output (JSON)">
        <textarea value={traceInput} onChange={(e) => setTraceInput(e.target.value)}
          className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-3 py-2 text-[11px] font-mono text-primary outline-none min-h-[120px]"
          placeholder='Paste agent output JSON here...' />
        <button onClick={handleParse} disabled={!traceInput.trim()}
          className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          <Search size={14} /> Parse & Trace
        </button>
      </Card>

      {parsed && (
        <Card title="Traced Reasoning">
          {parsed._unparseable ? (
            <div className="text-xs font-mono whitespace-pre-wrap text-primary">{parsed.raw}</div>
          ) : (
            <div className="text-xs font-mono leading-relaxed">{renderValue(parsed, 'root')}</div>
          )}
        </Card>
      )}

      {!traceInput && (
        <Card title="Quick Tips">
          <ul className="space-y-1 text-xs text-muted">
            <li>• Paste output from the <strong>Hedge Fund</strong> or <strong>Agents</strong> page</li>
            <li>• The trace explorer shows nested reasoning chains</li>
            <li>• Each agent&apos;s data sources, calculations, and conclusions are visible</li>
            <li>• Click on arrays and objects to expand/collapse</li>
          </ul>
        </Card>
      )}
    </div>
  )
}
