import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import { generateIndicator } from '../api/llm'
import { Sparkles, Copy, RotateCcw } from 'lucide-react'

export default function AIIndicatorGenerator() {
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return
    setLoading(true)
    setCode('')
    setName('')
    setWarnings([])
    try {
      const res = await generateIndicator(description)
      setCode(res.code)
      setName(res.name)
      setWarnings(res.warnings)
    } catch (e: unknown) {
      setWarnings([(e as Error).message])
    }
    setLoading(false)
  }, [description])

  const copyCode = () => navigator.clipboard.writeText(code)

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2">
        <Sparkles size={20} /> AI Indicator Generator
      </h1>
      <p className="text-sm text-muted">Describe a custom technical indicator in plain English and get executable JavaScript code.</p>

      <Card title="Describe Your Indicator">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-3 py-2 text-sm text-primary outline-none min-h-[80px]"
          placeholder="e.g. Show me when RSI(14) diverges from price — mark bullish divergence when price makes lower low but RSI makes higher low"
        />
        <button onClick={handleGenerate} disabled={loading || !description.trim()}
          className="mt-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          {loading ? 'Generating...' : 'Generate Indicator'}
        </button>
      </Card>

      {warnings.length > 0 && (
        <div className="bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.3)] rounded-md px-3 py-2 text-xs text-accent-yellow">
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      {code && (
        <Card title={name || 'Generated Indicator'}>
          <div className="relative">
            <pre className="bg-[var(--bg-hover)] border border-default rounded-md p-3 text-[11px] font-mono overflow-auto max-h-[500px] text-primary">{code}</pre>
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={copyCode} className="bg-card border border-default px-2 py-1 rounded text-[10px] cursor-pointer text-muted hover:text-primary"><Copy size={12} /></button>
              <button onClick={() => { setCode(''); setName(''); setWarnings([]) }}
                className="bg-card border border-default px-2 py-1 rounded text-[10px] cursor-pointer text-muted hover:text-primary"><RotateCcw size={12} /></button>
            </div>
          </div>
          <div className="text-[10px] text-muted mt-2">
            Copy this code into the chart indicator panel to use it.
          </div>
        </Card>
      )}
    </div>
  )
}
