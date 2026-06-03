import { useState, useCallback, useRef, useEffect } from 'react'
import { searchPatterns, analyzeQuery, type ChartPattern } from '../utils/chartGPT'

interface Props {
  onDrawPattern?: (patternId: string) => void
  onAddIndicator?: (indicatorId: string) => void
  onSetTimeframe?: (tf: string) => void
  onClearIndicators?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onDrawTool?: (tool: string) => void
}

export default function ChartGPTPanel({
  onDrawPattern, onAddIndicator, onSetTimeframe,
  onClearIndicators, onZoomIn, onZoomOut, onDrawTool,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChartPattern[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const SUGGESTIONS = [
    'find double top pattern',
    'show bullish patterns',
    'add RSI indicator',
    'draw fib retracement',
    'switch to 1h timeframe',
    'find reversal patterns',
    'add Bollinger Bands',
  ]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const parsed = analyzeQuery(q)
    const patternResults = searchPatterns(q)

    switch (parsed.action) {
      case 'ADD_INDICATOR':
        onAddIndicator?.(parsed.params.indicator)
        setResults([{ id: 'action', name: `Added ${parsed.params.indicator.toUpperCase()}`, type: 'analysis', description: `Indicator added to chart`, confidence: 1 }])
        break
      case 'SET_TIMEFRAME':
        onSetTimeframe?.(parsed.params.timeframe)
        setResults([{ id: 'action', name: `Timeframe: ${parsed.params.timeframe}`, type: 'analysis', description: `Switched to ${parsed.params.timeframe}`, confidence: 1 }])
        break
      case 'CLEAR_INDICATORS':
        onClearIndicators?.()
        setResults([{ id: 'action', name: 'Cleared Indicators', type: 'analysis', description: 'All indicators removed', confidence: 1 }])
        break
      case 'ZOOM_IN':
        onZoomIn?.()
        break
      case 'ZOOM_OUT':
        onZoomOut?.()
        break
      case 'DRAW_TRENDLINE':
        onDrawTool?.('trendline')
        break
      case 'DRAW_FIB':
        onDrawTool?.('fib')
        break
      case 'DRAW_RECTANGLE':
        onDrawTool?.('rectangle')
        break
      default:
        if (patternResults.length > 0) {
          setResults(patternResults.slice(0, 10))
        } else {
          setResults([{ id: 'no-results', name: 'No patterns found', type: 'analysis', description: `Try: "find double top", "show bullish patterns", "add RSI"`, confidence: 0 }])
        }
    }
    setIsSearching(false)
  }, [onAddIndicator, onSetTimeframe, onClearIndicators, onZoomIn, onZoomOut, onDrawTool])

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
    setShowSuggestions(false)
  }

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: 4, width: 300,
    }}>
      <div style={{ position: 'relative', padding: 6, borderBottom: '1px solid var(--border-color, #1a2332)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch(query)
            }}
            onFocus={() => !query && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Ask ChartGPT..."
            style={{
              flex: 1, padding: '4px 8px', fontSize: 10,
              background: 'var(--bg-input, #0a0e14)',
              border: '1px solid var(--border-color, #1a2332)',
              color: 'var(--text-primary)',
              fontFamily: 'JetBrains Mono, monospace',
              outline: 'none', borderRadius: 3,
            }}
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={isSearching || query.trim().length < 2}
            style={{
              padding: '4px 8px', borderRadius: 3, fontSize: 9, fontWeight: 600, cursor: 'pointer',
              background: isSearching ? 'var(--text-muted)' : 'var(--accent-blue, #3b82f6)',
              border: 'none', color: '#fff',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Search
          </button>
        </div>

        {showSuggestions && !query && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--bg-card, #0d1117)',
            border: '1px solid var(--border-color, #1a2332)',
            borderTop: 'none', zIndex: 10,
            borderRadius: '0 0 4px 4px', overflow: 'hidden',
          }}>
            {SUGGESTIONS.map((s, i) => (
              <div
                key={i}
                onClick={() => handleSuggestion(s)}
                style={{
                  padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)',
                  fontSize: 9, borderBottom: '1px solid rgba(26,35,50,0.5)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ maxHeight: 240, overflow: 'auto' }}>
          {results.map((pattern, i) => (
            <div
              key={pattern.id}
              onClick={() => {
                if (pattern.type === 'pattern') onDrawPattern?.(pattern.id)
              }}
              style={{
                padding: '5px 8px', cursor: pattern.type === 'pattern' ? 'pointer' : 'default',
                borderBottom: '1px solid rgba(26,35,50,0.5)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              }}
              onMouseEnter={e => { if (pattern.type === 'pattern') e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                  <span style={{
                    fontSize: 7, padding: '1px 3px', borderRadius: 2, fontWeight: 600,
                    background: pattern.type === 'pattern' ? '#3b82f6' : pattern.type === 'indicator' ? '#22c55e' : '#8b5cf6',
                    color: '#fff', textTransform: 'uppercase',
                  }}>
                    {pattern.type === 'analysis' ? 'action' : pattern.type}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 9 }}>
                    {pattern.name}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{pattern.description}</div>
              </div>
              {pattern.confidence > 0 && (
                <div style={{
                  fontSize: 7, color: pattern.confidence > 0.7 ? '#22c55e' : pattern.confidence > 0.4 ? '#f59e0b' : '#ef4444',
                  whiteSpace: 'nowrap', marginLeft: 4,
                }}>
                  {Math.round(pattern.confidence * 100)}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
