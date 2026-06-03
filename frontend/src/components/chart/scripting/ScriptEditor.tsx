import { useState, useRef, useCallback, useEffect, type JSX } from 'react'
import { IndicatorScriptEngine, SCRIPT_PRESETS } from './IndicatorScript'
import type { ScriptIndicator } from './IndicatorScript'
type CandlestickData = { time: number; open: number; high: number; low: number; close: number; volume?: number }

interface ScriptEditorProps {
  onScriptRun: (result: { values: number[]; name: string; style: string; color: string }) => void
  onClose: () => void
  data?: CandlestickData[]
}

const PRESET_COLORS = ['#3b82f6', '#a855f7', '#f97316', '#10b981', '#ffd54f', '#ef5350', '#26a69a', '#ab47bc', '#06b6d4', '#f59e0b']
const ENGINE = new IndicatorScriptEngine()

function highlightSyntax(code: string): { text: string; tokens: { start: number; end: number; type: 'function' | 'number' | 'operator' | 'string' }[] } {
  const tokens: { start: number; end: number; type: 'function' | 'number' | 'operator' | 'string' }[] = []
  const funcPattern = /\b(SMA|EMA|RSI|MACD|BOLLINGER|ATR|HIGHEST|LOWEST|CROSS|CROSSOVER|CROSSUNDER|ABS|MIN|MAX|SUM)\b/g
  const numPattern = /\b\d+\.?\d*\b/g
  const opPattern = /[+\-*/]/g

  let match: RegExpExecArray | null = null
  while ((match = funcPattern.exec(code)) !== null) {
    tokens.push({ start: match.index, end: match.index + match[0].length, type: 'function' })
  }
  while ((match = numPattern.exec(code)) !== null) {
    tokens.push({ start: match.index, end: match.index + match[0].length, type: 'number' })
  }
  while ((match = opPattern.exec(code)) !== null) {
    tokens.push({ start: match.index, end: match.index + match[0].length, type: 'operator' })
  }

  return { text: code, tokens }
}

function renderHighlightedCode(code: string): JSX.Element {
  const { tokens } = highlightSyntax(code)
  const sorted = [...tokens].sort((a, b) => a.start - b.start)

  const parts: JSX.Element[] = []
  let lastIndex = 0

  for (const t of sorted) {
    if (t.start > lastIndex) {
      parts.push(<span key={`t${lastIndex}`}>{code.slice(lastIndex, t.start)}</span>)
    }
    const className =
      t.type === 'function' ? 'hl-function' :
      t.type === 'number' ? 'hl-number' :
      t.type === 'operator' ? 'hl-operator' : ''
    parts.push(
      <span key={`t${t.start}`} className={className}>
        {code.slice(t.start, t.end)}
      </span>,
    )
    lastIndex = t.end
  }

  if (lastIndex < code.length) {
    parts.push(<span key={`t${lastIndex}`}>{code.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}

function detectInputs(formula: string): string[] {
  const inputPattern = /\b[a-z][a-zA-Z0-9]*(?=\s*[,)])/g
  const reserved = new Set(['close', 'open', 'high', 'low', 'volume'])
  const found = new Set<string>()
  let match: RegExpExecArray | null = null

  const funcPattern = /\b(SMA|EMA|RSI|MACD|BOLLINGER|ATR|HIGHEST|LOWEST|CROSS|CROSSOVER|CROSSUNDER|ABS|MIN|MAX|SUM)\s*\(/g
  const funcNames = new Set<string>()
  while ((match = funcPattern.exec(formula)) !== null) {
    funcNames.add(match[1])
  }

  const idPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g
  while ((match = idPattern.exec(formula)) !== null) {
    const name = match[1]
    if (!reserved.has(name.toLowerCase()) && !funcNames.has(name)) {
      found.add(name)
    }
  }

  return Array.from(found)
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.7)',
  zIndex: 1000,
  fontFamily: 'JetBrains Mono, monospace',
}

const modalStyle: React.CSSProperties = {
  width: '800px',
  height: '620px',
  background: '#0d1117',
  border: '1px solid #1a2332',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  borderBottom: '1px solid #1a2332',
  background: '#0a0e14',
}

const titleStyle: React.CSSProperties = {
  color: '#e8eaed',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
}

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#5d6b7e',
  cursor: 'pointer',
  fontSize: '16px',
  padding: '2px 6px',
  borderRadius: '4px',
}

const bodyStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
}

const editorPanelStyle: React.CSSProperties = {
  width: '60%',
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #1a2332',
}

const editorContainerStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  background: '#0a0e14',
}

const gutterStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '44px',
  height: '100%',
  background: '#0d1117',
  borderRight: '1px solid #1a2332',
  overflow: 'hidden',
  paddingTop: '8px',
  userSelect: 'none',
}

const textareaStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'none',
  color: 'transparent',
  caretColor: '#26a69a',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  lineHeight: '1.6',
  padding: '8px 8px 8px 52px',
  whiteSpace: 'pre',
  overflow: 'auto',
  tabSize: 2,
}

const highlightLayerStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  lineHeight: '1.6',
  padding: '8px 8px 8px 52px',
  whiteSpace: 'pre',
  overflow: 'hidden',
  color: '#5d6b7e',
}

const sidebarStyle: React.CSSProperties = {
  width: '40%',
  display: 'flex',
  flexDirection: 'column',
  padding: '12px',
  gap: '8px',
  overflowY: 'auto',
}

const labelStyle: React.CSSProperties = {
  color: '#5d6b7e',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '2px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a0e14',
  border: '1px solid #1a2332',
  borderRadius: '4px',
  color: '#e8eaed',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '10px',
  padding: '4px 8px',
  outline: 'none',
  boxSizing: 'border-box',
}

const presetBtnStyle: React.CSSProperties = {
  background: '#1a2332',
  border: '1px solid #2a3a4a',
  borderRadius: '4px',
  color: '#e8eaed',
  fontSize: '9px',
  fontFamily: 'JetBrains Mono, monospace',
  padding: '4px 8px',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
}

const colorBtnStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  borderRadius: '4px',
  border: '2px solid transparent',
  cursor: 'pointer',
  padding: 0,
}

const footerStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderTop: '1px solid #1a2332',
  background: '#0a0e14',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: '28px',
}

const outputStyle: React.CSSProperties = {
  fontSize: '10px',
  fontFamily: 'JetBrains Mono, monospace',
  color: '#5d6b7e',
  flex: 1,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
}

const runBtnStyle: React.CSSProperties = {
  background: '#26a69a',
  border: 'none',
  borderRadius: '4px',
  color: '#fff',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '10px',
  fontWeight: 600,
  padding: '4px 12px',
  cursor: 'pointer',
}

const addBtnStyle: React.CSSProperties = {
  background: '#3b82f6',
  border: 'none',
  borderRadius: '4px',
  color: '#fff',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '10px',
  fontWeight: 600,
  padding: '4px 12px',
  cursor: 'pointer',
}

export default function ScriptEditor({ onScriptRun, onClose, data }: ScriptEditorProps) {
  const [code, setCode] = useState('SMA(close, 20) - SMA(close, 50)')
  const [indicatorName, setIndicatorName] = useState('Custom Indicator')
  const [selectedColor, setSelectedColor] = useState('#3b82f6')
  const [style, setStyle] = useState<'line' | 'histogram' | 'overlay'>('line')
  const [output, setOutput] = useState<string>('')
  const [outputValues, setOutputValues] = useState<number[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [detectedInputs, setDetectedInputs] = useState<string[]>([])
  const [inputValues, setInputValues] = useState<Record<string, number>>({})

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const inputs = detectInputs(code)
    setDetectedInputs(inputs)
    const newInputs: Record<string, number> = { ...inputValues }
    for (const inp of inputs) {
      if (!(inp in newInputs)) {
        newInputs[inp] = 14
      }
    }
    setInputValues(newInputs)
  }, [code])

  const runScript = useCallback(() => {
    if (!data || data.length === 0) {
      setErrors(['No data available'])
      setOutput('')
      return
    }

    setErrors([])
    const result = ENGINE.evaluate(code, data as any, inputValues)

    if (result.errors && result.errors.length > 0) {
      setErrors(result.errors)
      setOutput('')
      setOutputValues([])
      return
    }

    const valid = result.values.filter((v) => !isNaN(v) && isFinite(v))
    setOutputValues(result.values)

    if (valid.length === 0) {
      setOutput('No valid values computed')
      return
    }

    const firstFive = result.values.slice(0, 5).map((v) => v.toFixed(2)).join(', ')
    setOutput(`[${firstFive}${result.values.length > 5 ? ', ...' : ''}]  (${result.values.length} bars)`)
  }, [code, data, inputValues])

  const handleAddToChart = useCallback(() => {
    if (outputValues.length === 0) {
      runScript()
    }

    if (outputValues.length === 0 && errors.length > 0) return

    onScriptRun({
      values: outputValues,
      name: indicatorName,
      style,
      color: selectedColor,
    })
  }, [outputValues, indicatorName, style, selectedColor, onScriptRun, runScript, errors.length])

  const loadPreset = useCallback((preset: ScriptIndicator) => {
    setCode(preset.formula)
    setIndicatorName(preset.name)
    setSelectedColor(preset.color)
    setStyle(preset.style)
    const vals: Record<string, number> = {}
    for (const inp of preset.inputs) {
      vals[inp.name] = inp.default as number
    }
    setInputValues(vals)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        runScript()
      }
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [runScript, onClose],
  )

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [onClose])

  const lines = code.split('\n')
  const lineCount = lines.length

  return (
    <div style={modalOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle} onKeyDown={handleKeyDown}>
        <div style={headerStyle}>
          <span style={titleStyle}>Script Editor</span>
          <span style={{ color: '#5d6b7e', fontSize: '9px' }}>Ctrl+Enter to run · Esc to close</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={bodyStyle}>
          <div style={editorPanelStyle}>
            <div style={editorContainerStyle}>
              <div style={gutterStyle}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      color: '#2a3a4a',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      lineHeight: '1.6',
                      textAlign: 'right',
                      paddingRight: '8px',
                      userSelect: 'none',
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <div style={highlightLayerStyle}>
                {renderHighlightedCode(code + '\n'.repeat(Math.max(0, 10 - lineCount)))}
              </div>

              <textarea
                ref={textareaRef}
                style={textareaStyle}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                rows={20}
              />
            </div>

            <style>{`
              .hl-function { color: #3b82f6; }
              .hl-number { color: #ffd54f; }
              .hl-operator { color: #ab47bc; }
              textarea::selection { background: rgba(59,130,246,0.3); }
            `}</style>
          </div>

          <div style={sidebarStyle}>
            <div>
              <div style={labelStyle}>Indicator Name</div>
              <input
                style={inputStyle}
                value={indicatorName}
                onChange={(e) => setIndicatorName(e.target.value)}
              />
            </div>

            <div>
              <div style={labelStyle}>Style</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['line', 'histogram', 'overlay'] as const).map((s) => (
                  <button
                    key={s}
                    style={{
                      ...presetBtnStyle,
                      background: style === s ? '#1a3a4a' : '#1a2332',
                      border: style === s ? '1px solid #3b82f6' : '1px solid #2a3a4a',
                      textTransform: 'capitalize',
                      width: 'auto',
                      flex: 1,
                      textAlign: 'center',
                    }}
                    onClick={() => setStyle(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={labelStyle}>Color</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    style={{
                      ...colorBtnStyle,
                      background: c,
                      borderColor: selectedColor === c ? '#fff' : 'transparent',
                    }}
                    onClick={() => setSelectedColor(c)}
                  />
                ))}
              </div>
            </div>

            {detectedInputs.length > 0 && (
              <div>
                <div style={labelStyle}>Input Parameters</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {detectedInputs.map((name) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#5d6b7e', fontSize: '10px', width: '60px', flexShrink: 0 }}>
                        {name}
                      </span>
                      <input
                        style={{ ...inputStyle, width: '60px' }}
                        type="number"
                        value={inputValues[name] ?? 14}
                        onChange={(e) =>
                          setInputValues((prev) => ({ ...prev, [name]: parseFloat(e.target.value) || 0 }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={labelStyle}>Presets</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {SCRIPT_PRESETS.map((p) => (
                  <button key={p.name} style={presetBtnStyle} onClick={() => loadPreset(p)}>
                    <span style={{ color: p.color }}>◆</span> {p.name}
                    <span style={{ color: '#5d6b7e', marginLeft: '6px' }}>{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
              <button style={{ ...runBtnStyle, flex: 1 }} onClick={runScript}>
                Run
              </button>
              <button style={{ ...addBtnStyle, flex: 1 }} onClick={handleAddToChart}>
                Add to Chart
              </button>
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <div style={outputStyle}>
            {errors.length > 0 ? (
              <span style={{ color: '#ef5350' }}>⚠ {errors[0]}</span>
            ) : output ? (
              <span>{output}</span>
            ) : (
              <span style={{ color: '#2a3a4a' }}>Ready</span>
            )}
          </div>
          <div style={{ color: '#2a3a4a', fontSize: '9px' }}>
            {outputValues.filter((v) => !isNaN(v)).length} valid values
          </div>
        </div>
      </div>
    </div>
  )
}
