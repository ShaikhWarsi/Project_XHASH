import { useRef, useState, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { api, listStrategyTemplates, getStrategyTemplate } from '../api/client'
import { Play, Save, Copy, RotateCcw, FileCode, FileDown, Table, LayoutGrid } from 'lucide-react'

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

const TEMPLATES: Record<string, string> = {
  'SMA Cross': `strategy("SMA Cross", { initialCapital: 100000, commission: 0.001 })

fastMA = sma(close, 20)
slowMA = sma(close, 50)

if (crossOver(fastMA, slowMA)) {
  entry("Buy", direction=long, shares=100)
}

if (crossUnder(fastMA, slowMA)) {
  exit("Sell", shares=100)
}

plot(fastMA, "Fast MA")
plot(slowMA, "Slow MA")`,
  'Momentum': `strategy("Momentum", { initialCapital: 100000, commission: 0.001 })

momentumPeriod = 20
threshold = 0.05
ret = roc(close, momentumPeriod)

if (ret > threshold) {
  entry("Buy", direction=long, shares=100)
}

if (ret < 0) {
  exit("Sell", shares=100)
}

plot(ret, "Return")`,
  'Mean Reversion': `strategy("Mean Reversion", { initialCapital: 100000, commission: 0.001 })

lookback = 20
upper = 2.0
lower = -2.0

z = zscore(close, lookback)

if (z < lower) {
  entry("Buy", direction=long, shares=100)
}

if (z > upper) {
  exit("Sell", shares=100)
}

plot(z, "Z-Score")`,
  'Pairs Trade': `strategy("Pairs Trade", { initialCapital: 100000, commission: 0.001 })

spread = close("AAPL") - close("MSFT")
spreadMA = sma(spread, 20)
spreadSD = stdev(spread, 20)

if (spread > spreadMA + 2 * spreadSD) {
  entry("Short Spread", direction=short, shares=100)
}

if (spread < spreadMA - 2 * spreadSD) {
  entry("Long Spread", direction=long, shares=100)
}

if (abs(spread - spreadMA) < 0.5 * spreadSD) {
  exit("Close", shares=100)
}`,
  'Stat Arb': `strategy("Stat Arb", { initialCapital: 100000, commission: 0.001 })

hedgeRatio = 1.5
lookback = 60
spread = close("AAPL") - hedgeRatio * close("MSFT")
spreadMA = sma(spread, lookback)
spreadSD = stdev(spread, lookback)

if (spread > spreadMA + spreadSD) {
  entry("Short", direction=short, shares=100)
}

if (spread < spreadMA - spreadSD) {
  entry("Long", direction=long, shares=100)
}

if (abs(spread - spreadMA) < 0.3 * spreadSD) {
  exit("Neutral", shares=100)
}`,
  'Vol Targeting': `strategy("Vol Targeting", { initialCapital: 100000, commission: 0.001 })

targetVol = 0.15
lookback = 20
histVol = stdev(roc(close, 1), lookback) * sqrt(252)
positionSize = targetVol / histVol

entry("Scale In", direction=long, shares=floor(positionSize * 100))

if (histVol > targetVol * 2) {
  exit("Reduce", shares=100)
}

plot(histVol, "Realized Vol")`,
}

function convertToPineScript(code: string): string {
  let ps = code
  ps = ps.replace(/\bstrategy\b/g, '//@version=5\nstrategy')
  ps = ps.replace(/\bentry\(/g, 'strategy.entry(')
  ps = ps.replace(/\bexit\(/g, 'strategy.close(')
  ps = ps.replace(/\bplot\(/g, 'plot(')
  ps = ps.replace(/\bbuy\(/g, 'strategy.order(')
  ps = ps.replace(/\bsell\(/g, 'strategy.order(')
  ps = ps.replace(/\bdirection=long\b/g, 'long=true')
  ps = ps.replace(/\bdirection=short\b/g, 'long=false')
  return ps
}

function convertToMT5(code: string): string {
  const lines = code.split('\n')
  const out: string[] = []
  out.push('//+------------------------------------------------------------------+')
  out.push('//| Generated from FinScript                                      |')
  out.push('//+------------------------------------------------------------------+')
  out.push('input double InitialCapital = 100000;')
  out.push('input double Commission = 0.001;')
  out.push('')
  out.push('int OnInit() {')
  out.push('   return INIT_SUCCEEDED;')
  out.push('}')
  out.push('')
  out.push('void OnTick() {')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('//')) {
      out.push('   //' + trimmed.slice(2))
    } else if (trimmed.startsWith('strategy(')) {
      out.push('   // ' + trimmed)
    } else if (trimmed.startsWith('if (')) {
      const cond = trimmed.slice(4, trimmed.indexOf(')'))
      out.push('   if (' + cond.replace(/sma\(/g, 'iMA(NULL,0,').replace(/crossOver\(/g, 'crossOver(').replace(/crossUnder\(/g, 'crossUnder(') + ')')
      out.push('   {')
    } else if (trimmed === '{' || trimmed === '}') {
      out.push('   ' + trimmed)
    } else if (trimmed.startsWith('buy(') || trimmed.startsWith('entry(')) {
      out.push('      OrderSend(NULL, OP_BUY, 0.1, Ask, 3, 0, 0);')
    } else if (trimmed.startsWith('sell(') || trimmed.startsWith('exit(')) {
      out.push('      OrderClose(OrderTicket(), OrderLots(), Bid, 3);')
    } else {
      out.push('   // ' + trimmed)
    }
  }
  out.push('}')
  out.push('')
  out.push('double iMA(string sym, int tf, int period) {')
  out.push('   return iMA(sym, tf, period, 0, MODE_SMA, PRICE_CLOSE);')
  out.push('}')
  return out.join('\n')
}

export default function StrategyCode() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [templates, setTemplates] = useState<{ name: string; description: string }[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [monacoReady, setMonacoReady] = useState(false)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)

  useEffect(() => {
    setLoadingTemplates(true)
    listStrategyTemplates().then((list) => {
      if (Array.isArray(list)) setTemplates(list)
    }).catch(() => {}).finally(() => setLoadingTemplates(false))
  }, [])

  const loadApiTemplate = async (name: string) => {
    setOutput(`Loading template: ${name}...`)
    try {
      const t = await getStrategyTemplate(name)
      if (t.code) setCode(t.code)
      setOutput(`Loaded template: ${name}`)
    } catch {
      setOutput(`Template "${name}" not available from API, try local templates.`)
    }
    setShowGallery(false)
  }

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco
    setMonacoReady(true)

    monaco.languages.register({ id: 'finscript' })

    monaco.languages.setMonarchTokensProvider('finscript', {
      keywords: [
        'strategy', 'entry', 'exit', 'long', 'short', 'stop', 'limit',
        'indicator', 'plot', 'if', 'then', 'else', 'return', 'var', 'let',
        'const', 'function', 'buy', 'sell', 'shares', 'direction', 'crossOver',
        'crossUnder', 'sma', 'ema', 'stdev', 'roc', 'zscore', 'close', 'high',
        'low', 'open', 'volume', 'abs', 'floor', 'sqrt', 'true', 'false',
      ],
      typeKeywords: [],
      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
      ],
      symbols: /[=><!~?:&|+\-*/^%]+/,
      tokenizer: {
        root: [
          [/@symbols/, { cases: { '@operators': 'operator' } }],
          { include: '@whitespace' },
          [/\d+\.\d+/, 'number.float'],
          [/\d+/, 'number'],
          [/[a-z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
        ],
        whitespace: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/\s+/, 'white'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ],
      },
    })

    monaco.languages.registerCompletionItemProvider('finscript', {
      provideCompletionItems: () => ({
        suggestions: [
          ...['strategy', 'entry', 'exit', 'buy', 'sell', 'plot', 'if', 'else', 'return'].map((kw) => ({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
          })),
          ...['sma', 'ema', 'stdev', 'roc', 'zscore', 'crossOver', 'crossUnder'].map((fn) => ({
            label: fn,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${fn}($1)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          })),
          ...['close', 'high', 'low', 'open', 'volume'].map((v) => ({
            label: v,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: v,
          })),
        ],
      }),
    })
  }

  useEffect(() => {
    if (monacoReady && monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, 'finscript')
      }
    }
  }, [monacoReady])

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
      const monaco = monacoRef.current
      const editor = editorRef.current
      if (monaco && editor) {
        const model = editor.getModel()
        if (model) monaco.editor.setModelMarkers(model, 'finscript', [])
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Error evaluating script'
      setOutput(msg)
      const monaco = monacoRef.current
      const editor = editorRef.current
      if (monaco && editor) {
        const model = editor.getModel()
        if (model) {
          const lineMatch = msg.match(/line (\d+)/i)
          const lineNum = lineMatch ? parseInt(lineMatch[1]) : 1
          monaco.editor.setModelMarkers(model, 'finscript', [{
            severity: monaco.MarkerSeverity.Error,
            message: msg,
            startLineNumber: lineNum,
            endLineNumber: lineNum,
            startColumn: 1,
            endColumn: 1000,
          }])
          editor.revealLineInCenter(lineNum)
          editor.deltaDecorations([], [
            {
              range: new monaco.Range(lineNum, 1, lineNum, 1000),
              options: { isWholeLine: true, className: 'errorLineDecoration', glyphMarginClassName: 'errorGlyph' },
            },
          ])
        }
      }
    } finally {
      setRunning(false)
    }
  }, [code])

  const compileCode = useCallback(async () => {
    setRunning(true)
    setOutput('')
    try {
      const { data } = await api.post('/finscript/compile', { code })
      const success = data.success !== false && !data.error
      setOutput(success ? 'Compilation successful.' : (data.error || data.message || 'Compilation failed'))
      const monaco = monacoRef.current
      const editor = editorRef.current
      if (monaco && editor) {
        const model = editor.getModel()
        if (model) {
          if (success) {
            monaco.editor.setModelMarkers(model, 'finscript', [])
            editor.deltaDecorations([], [])
          } else {
            const errLine = data.line || 1
            monaco.editor.setModelMarkers(model, 'finscript', [{
              severity: monaco.MarkerSeverity.Error,
              message: data.error || data.message || 'Compilation error',
              startLineNumber: errLine,
              endLineNumber: errLine,
              startColumn: 1,
              endColumn: 1000,
            }])
            editor.revealLineInCenter(errLine)
          }
        }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Compilation error'
      setOutput(msg)
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

  const loadTemplate = (name: string) => {
    setCode(TEMPLATES[name] || DEFAULT_CODE)
    setOutput(`Loaded template: ${name}`)
    setShowTemplates(false)
  }

  const exportPine = async () => {
    setOutput('')
    try {
      const { data } = await api.post('/finscript/export/pine', { code })
      setOutput(data.code || data.result || JSON.stringify(data, null, 2))
    } catch {
      setOutput(convertToPineScript(code))
    }
  }

  const exportMT5 = async () => {
    setOutput('')
    try {
      const { data } = await api.post('/finscript/export/mt5', { code })
      setOutput(data.code || data.result || JSON.stringify(data, null, 2))
    } catch {
      setOutput(convertToMT5(code))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <style>{`
        .errorLineDecoration { background: color-mix(in srgb, var(--accent-red) 20%, transparent); }
        .errorGlyph { background: var(--accent-red); border-radius: 50%; width: 8px !important; height: 8px !important; margin-left: 4px; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ ...FONT, fontWeight: 700, color: 'var(--accent-green)' }}>
          STRATEGY CODE
        </span>
        <span style={{ ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>
          Write FinScript strategies with full indicator library
        </span>
        <div style={{ flex: 1 }} />
        <div className="flex gap-1">
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowTemplates(!showTemplates)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
              <Table size={12} /> TEMPLATES
            </button>
            {showTemplates && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 4, zIndex: 100, minWidth: 180, overflow: 'hidden' }}>
                {Object.keys(TEMPLATES).map((name) => (
                  <div key={name}
                    onClick={() => loadTemplate(name)}
                    style={{ padding: '6px 12px', cursor: 'pointer', ...FONT, fontSize: 11, color: 'var(--text-primary)', borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >{name}</div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowGallery(!showGallery)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
            <LayoutGrid size={12} /> GALLERY
          </button>
        </div>
        <button onClick={compileCode} disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-purple)', color: '#fff', border: 'none', ...FONT, fontWeight: 600, padding: '3px 10px', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.5 : 1 }}>
          <FileCode size={12} /> {running ? '...' : 'COMPILE'}
        </button>
        <button onClick={runCode} disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-cyan)', color: '#000', border: 'none', ...FONT, fontWeight: 600, padding: '3px 10px', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.5 : 1 }}>
          <Play size={12} /> {running ? 'RUNNING...' : 'RUN'}
        </button>
        <button onClick={exportPine}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
          <FileDown size={12} /> EXPORT PS
        </button>
        <button onClick={exportMT5}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
          <FileDown size={12} /> EXPORT MT5
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

      {showGallery && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowGallery(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, maxWidth: 720, width: '90%', maxHeight: '80vh', overflow: 'auto', padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ ...FONT, fontSize: 14, fontWeight: 700, color: 'var(--accent-green)' }}>STRATEGY TEMPLATES GALLERY</h2>
              <button onClick={() => setShowGallery(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            {loadingTemplates ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading templates...</div>
            ) : templates.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {templates.map((t) => (
                  <div key={t.name} onClick={() => loadApiTemplate(t.name)}
                    style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', background: 'var(--bg-hover)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                    <div style={{ ...FONT, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>API templates unavailable. Loading local templates:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {Object.keys(TEMPLATES).map((name) => (
                    <div key={name} onClick={() => { loadTemplate(name); setShowGallery(false) }}
                      style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', background: 'var(--bg-hover)' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                      <div style={{ ...FONT, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
