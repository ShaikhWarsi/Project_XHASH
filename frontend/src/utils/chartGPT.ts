export interface ChartPattern {
  id: string
  name: string
  type: 'pattern' | 'indicator' | 'analysis' | 'drawing'
  description: string
  confidence: number
}

const PATTERN_DATA: ChartPattern[] = [
  { id: 'head-shoulders', name: 'Head & Shoulders', type: 'pattern', description: 'Bearish reversal pattern with three peaks', confidence: 1 },
  { id: 'inv-head-shoulders', name: 'Inverse H&S', type: 'pattern', description: 'Bullish reversal pattern with three troughs', confidence: 1 },
  { id: 'double-top', name: 'Double Top', type: 'pattern', description: 'Bearish reversal after two peaks at resistance', confidence: 1 },
  { id: 'double-bottom', name: 'Double Bottom', type: 'pattern', description: 'Bullish reversal after two troughs at support', confidence: 1 },
  { id: 'triple-top', name: 'Triple Top', type: 'pattern', description: 'Bearish reversal with three peaks at same level', confidence: 1 },
  { id: 'triple-bottom', name: 'Triple Bottom', type: 'pattern', description: 'Bullish reversal with three troughs at same level', confidence: 1 },
  { id: 'ascending-triangle', name: 'Ascending Triangle', type: 'pattern', description: 'Bullish continuation with flat top and rising bottom', confidence: 1 },
  { id: 'descending-triangle', name: 'Descending Triangle', type: 'pattern', description: 'Bearish continuation with flat bottom and falling top', confidence: 1 },
  { id: 'symmetrical-triangle', name: 'Symmetrical Triangle', type: 'pattern', description: 'Continuation pattern with converging trendlines', confidence: 1 },
  { id: 'bull-flag', name: 'Bull Flag', type: 'pattern', description: 'Bullish continuation with upward flag after strong move', confidence: 1 },
  { id: 'bear-flag', name: 'Bear Flag', type: 'pattern', description: 'Bearish continuation with downward flag after strong move', confidence: 1 },
  { id: 'wedge', name: 'Wedge', type: 'pattern', description: 'Price converging with both trendlines in same direction', confidence: 1 },
  { id: 'cup-handle', name: 'Cup & Handle', type: 'pattern', description: 'Bullish continuation with U-shaped base and small pullback', confidence: 1 },
  { id: 'rounded-bottom', name: 'Rounded Bottom', type: 'pattern', description: 'Gradual bullish reversal forming a U-shape', confidence: 1 },
  { id: 'rounded-top', name: 'Rounded Top', type: 'pattern', description: 'Gradual bearish reversal forming an inverted U', confidence: 1 },
  { id: 'channel-up', name: 'Rising Channel', type: 'pattern', description: 'Price bouncing between two parallel upward trendlines', confidence: 1 },
  { id: 'channel-down', name: 'Falling Channel', type: 'pattern', description: 'Price bouncing between two parallel downward trendlines', confidence: 1 },
  { id: 'gap-up', name: 'Gap Up', type: 'pattern', description: 'Price opens significantly higher than previous close', confidence: 1 },
  { id: 'gap-down', name: 'Gap Down', type: 'pattern', description: 'Price opens significantly lower than previous close', confidence: 1 },
  { id: 'vcp', name: 'VCP (Volatility Contraction)', type: 'pattern', description: 'Contracting range showing decreasing volatility before breakout', confidence: 1 },
]

export type PatternFilterType = 'all' | ChartPattern['type']

export function searchPatterns(query: string, filter: PatternFilterType = 'all'): ChartPattern[] {
  const q = query.toLowerCase().trim()

  if (!q) {
    return filter === 'all' ? PATTERN_DATA : PATTERN_DATA.filter(p => p.type === filter)
  }

  const queryTerms = q.split(/\s+/)

  const scored = PATTERN_DATA
    .filter(p => filter === 'all' || p.type === filter)
    .map(pattern => {
      let score = 0
      const nameLower = pattern.name.toLowerCase()
      const descLower = pattern.description.toLowerCase()
      const idLower = pattern.id.toLowerCase()

      for (const term of queryTerms) {
        if (nameLower === term) score += 10
        else if (idLower === term) score += 8
        else if (nameLower.includes(term)) score += 5
        else if (descLower.includes(term)) score += 3
        else if (idLower.includes(term)) score += 2
      }

      if (q.includes('bull') || q.includes('bullish')) {
        if (pattern.description.toLowerCase().includes('bullish')) score += 2
      }
      if (q.includes('bear') || q.includes('bearish')) {
        if (pattern.description.toLowerCase().includes('bearish')) score += 2
      }
      if (q.includes('continuation') || q.includes('continue')) {
        if (pattern.description.toLowerCase().includes('continuation')) score += 2
      }
      if (q.includes('reversal') || q.includes('reverse')) {
        if (pattern.description.toLowerCase().includes('reversal')) score += 2
      }

      return { ...pattern, confidence: score > 0 ? Math.min(score / 10, 1) : 0 }
    })
    .filter(p => p.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)

  return scored
}

export function analyzeQuery(query: string): { action: string; params: Record<string, string> } {
  const q = query.toLowerCase()

  if (q.includes('draw') && q.includes('trendline')) return { action: 'DRAW_TRENDLINE', params: {} }
  if (q.includes('draw') && q.includes('fib')) return { action: 'DRAW_FIB', params: {} }
  if (q.includes('draw') && q.includes('rectangle')) return { action: 'DRAW_RECTANGLE', params: {} }
  if (q.includes('add') && q.includes('rsi')) return { action: 'ADD_INDICATOR', params: { indicator: 'rsi' } }
  if (q.includes('add') && q.includes('macd')) return { action: 'ADD_INDICATOR', params: { indicator: 'macd' } }
  if (q.includes('add') && q.includes('bollinger')) return { action: 'ADD_INDICATOR', params: { indicator: 'bbands' } }
  if (q.includes('add') && q.includes('vwap')) return { action: 'ADD_INDICATOR', params: { indicator: 'vwap' } }
  if (q.includes('add') && q.includes('ema')) return { action: 'ADD_INDICATOR', params: { indicator: 'ema' } }
  if (q.includes('add') && q.includes('sma')) return { action: 'ADD_INDICATOR', params: { indicator: 'sma' } }
  if (q.includes('remove') || q.includes('clear')) return { action: 'CLEAR_INDICATORS', params: {} }
  if (q.includes('zoom') && q.includes('in')) return { action: 'ZOOM_IN', params: {} }
  if (q.includes('zoom') && q.includes('out')) return { action: 'ZOOM_OUT', params: {} }
  if (q.includes('1d') || q.includes('daily')) return { action: 'SET_TIMEFRAME', params: { timeframe: '1d' } }
  if (q.includes('1h') || q.includes('hourly')) return { action: 'SET_TIMEFRAME', params: { timeframe: '1h' } }
  if (q.includes('15m') || q.includes('15 minute')) return { action: 'SET_TIMEFRAME', params: { timeframe: '15m' } }
  if (q.includes('5m') || q.includes('5 minute')) return { action: 'SET_TIMEFRAME', params: { timeframe: '5m' } }
  if (q.includes('1m') || q.includes('1 minute')) return { action: 'SET_TIMEFRAME', params: { timeframe: '1m' } }

  return { action: 'SEARCH_PATTERNS', params: { query } }
}
