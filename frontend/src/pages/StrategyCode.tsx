import { useRef, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { api } from '../api/client'
import { Play, Save, Copy, RotateCcw } from 'lucide-react'

const DEFAULT_CODE = `// FinScript Strategy
// Write your strategy using built-in indicators

strategy("My Strategy", {
  initialCapital: 100000,
  commission: 0.001
})

// Entry condition
if (sma(close, 20) > sma(close, 50)) {
  buy("Long Entry", shares=100)
}

// Exit condition
if (close < sma(close, 20)) {
  sell("Exit Long", shares=100)
}

// Plot indicators
plot(sma(close, 20), "SMA 20")
plot(sma(close, 50), "SMA 50")
`

const FONT = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }

export default function StrategyCode() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const editorRef = useRef<any>(null)

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor
  }

  const runCode = useCallback(async () => {
    setRunning(true)
    setOutput('')
    try {
      const { data } = await api.post('/finscript/evaluate', {
        code,
        symbol: 'AAPL',
        start: '2024-01-01',
        end: '2024-12-31',
      })
      setOutput(JSON.stringify(data, null, 2))
    } catch (e: any) {
      setOutput(e?.response?.data?.detail || e?.message || 'Error evaluating script')
    } finally {
      setRunning(false)
    }
  }, [code])

  const copyCode = () => {
    navigator.clipboard.writeText(code)
  }

  const resetCode = () => {
    setCode(DEFAULT_CODE)
    setOutput('')
  }

  const saveCode = () => {
    localStorage.setItem('finscript-strategy', code)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ ...FONT, fontWeight: 700, color: 'var(--accent-green)' }}>
          STRATEGY CODE
        </span>
        <span style={{ ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>
          Write FinScript strategies with full indicator library
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={runCode} disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-cyan)', color: '#000', border: 'none', ...FONT, fontWeight: 600, padding: '3px 10px', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.5 : 1 }}>
          <Play size={12} /> {running ? 'RUNNING...' : 'RUN'}
        </button>
        <button onClick={saveCode}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
          <Save size={12} /> {saved ? 'SAVED' : 'SAVE'}
        </button>
        <button onClick={copyCode}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
          <Copy size={12} /> COPY
        </button>
        <button onClick={resetCode}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
          <RotateCcw size={12} /> RESET
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || '')}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              padding: { top: 8 },
            }}
          />
        </div>
        <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 4, padding: 8, background: 'var(--bg-card)', overflow: 'auto', ...FONT, fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
          {output || 'Click RUN to evaluate the strategy...'}
        </div>
      </div>
    </div>
  )
}
