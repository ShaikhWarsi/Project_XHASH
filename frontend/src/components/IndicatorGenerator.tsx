import { useState } from 'react'
import Card from './ui/Card'
import { generateIndicator } from '../api/llm'
import { useToastStore } from '../store/toast'

export default function IndicatorGenerator({ onAddToChart }: { onAddToChart?: (code: string) => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [indicatorId, setIndicatorId] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!description.trim()) return
    setGenerating(true)
    setError(null)
    setCode('')
    setName('')
    setIndicatorId('')
    setWarnings([])

    try {
      const res = await generateIndicator(description)
      setCode(res.code)
      setName(res.name)
      setIndicatorId(res.id)
      setWarnings(res.warnings || [])
    } catch (err: unknown) {
      setError((err as Error).message)
    }
    setGenerating(false)
  }

  const handleAddToChart = () => {
    if (!code.trim()) return
    if (onAddToChart) {
      onAddToChart(code)
    }
    try {
      if (typeof (window as any).__registerIndicator === 'function') {
        (window as any).__registerIndicator(code)
      }
      addToast(`Indicator "${name || indicatorId}" added to chart`, 'success')
    } catch {
      addToast('Failed to compile indicator code', 'error')
    }
  }

  return (
    <Card title="AI Indicator Generator" className="font-mono-data">
      <div className="space-y-2">
        <div>
          <label className="text-[9px] text-muted block mb-0.5">Indicator Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Green when price is above 50-day SMA AND RSI(14) is between 40 and 60"
            rows={4}
            className="w-full bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none resize-vertical"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !description.trim()}
          className="text-white border-none font-mono-data text-[10px] font-semibold px-3 py-1 rounded-sm w-full"
          style={{
            background: 'var(--accent-blue)',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? 'Generating...' : 'Generate Indicator'}
        </button>

        {error && <div className="text-down text-[10px]">{error}</div>}

        {warnings.length > 0 && (
          <div className="text-accent-yellow text-[9px]">{warnings.join('; ')}</div>
        )}

        {code && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted font-semibold tracking-wider uppercase">{name || 'Generated Code'}</span>
              <span className="text-[8px] text-muted">id: {indicatorId}</span>
            </div>
            <pre className="bg-black/40 border border-default rounded-sm p-2 overflow-x-auto max-h-[200px] overflow-y-auto">
              <code className="text-[9px] font-mono-data text-primary whitespace-pre">{code}</code>
            </pre>
            <button
              onClick={handleAddToChart}
              className="text-white border-none font-mono-data text-[10px] font-semibold px-3 py-1 rounded-sm w-full mt-1.5"
              style={{
                background: 'var(--accent-green)',
                cursor: 'pointer',
              }}
            >
              Add to Chart
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
