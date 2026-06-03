import { useState } from 'react'

interface StrategyCard {
  name: string
  description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  type: string
  returnProfile: string
  timeHorizon: string
  pros: string[]
  cons: string[]
}

const STRATEGIES: StrategyCard[] = [
  {
    name: 'Simple Moving Average Crossover',
    description: 'Buy when the fast SMA crosses above the slow SMA (Golden Cross), sell when it crosses below (Death Cross). One of the most widely used trend-following strategies.',
    difficulty: 'Beginner',
    type: 'Trend Following',
    returnProfile: 'Moderate, consistent during trending markets',
    timeHorizon: 'Medium-term (days/weeks)',
    pros: ['Easy to understand and implement', 'Works well in strong trends', 'Filters out minor noise'],
    cons: ['Lagging indicator — late entries/exits', 'Whipsaws in ranging markets', 'No adaptive parameters'],
  },
  {
    name: 'RSI Mean Reversion',
    description: 'Go long when RSI drops below 30 (oversold) and rises back above 30. Go short when RSI rises above 70 (overbought) and falls back below 70.',
    difficulty: 'Beginner',
    type: 'Mean Reversion',
    returnProfile: 'Good in range-bound markets, poor in trends',
    timeHorizon: 'Short-term (hours/days)',
    pros: ['Clear entry/exit signals', 'Works well in sideways markets', 'Can be combined with other indicators'],
    cons: ['Fails during strong trends', 'Can catch falling knives', 'Requires confirmation'],
  },
  {
    name: 'Bollinger Band Squeeze',
    description: 'Enter when price breaks out of a Bollinger Band squeeze (bands contracting). Direction determined by the breakout side with volume confirmation.',
    difficulty: 'Intermediate',
    type: 'Volatility Breakout',
    returnProfile: 'High when volatility expands, flat during compression',
    timeHorizon: 'Short to medium-term',
    pros: ['Captures explosive moves', 'Clear volatility-based signals', 'Works across all asset classes'],
    cons: ['False breakouts common', 'Requires patience during squeezes', 'Needs volume confirmation'],
  },
  {
    name: 'Ichimoku Cloud Strategy',
    description: 'Use the Ichimoku Cloud system: bullish when price is above the cloud, Tenkan > Kijun, and Chikou Span above price. Bearish for the opposite.',
    difficulty: 'Advanced',
    type: 'Multi-Timeframe',
    returnProfile: 'High reliability but fewer signals',
    timeHorizon: 'Medium to long-term',
    pros: ['Comprehensive system (support/resistance/trend)', 'Built-in future projection', 'Multi-timeframe alignment'],
    cons: ['Complex with many components', 'Lagging in fast markets', 'Steep learning curve'],
  },
  {
    name: 'Fibonacci Retracement Strategy',
    description: 'Enter on pullbacks to key Fibonacci levels (38.2%, 50%, 61.8%) in the direction of the larger trend. Use 61.8% as the invalidation level.',
    difficulty: 'Intermediate',
    type: 'Pullback/Continuation',
    returnProfile: 'Good risk/reward entries in trending markets',
    timeHorizon: 'Variable (intraday to weekly)',
    pros: ['Mathematical support/resistance levels', 'Works with any timeframe', 'Clear stop loss placement'],
    cons: ['Subjective level selection', 'Often fails in strong trends', 'Multiple levels can be confusing'],
  },
]

export default function StrategyOfTheDay() {
  const [card] = useState(() => STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)])
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      background: 'var(--bg-card, #151c23)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: 6, padding: 10, maxWidth: 320,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 8 }}>🎯</span>
          <span style={{ color: 'var(--text-primary)', fontSize: 9, fontWeight: 600 }}>Strategy of the Day</span>
        </div>
        <span style={{
          padding: '1px 5px', borderRadius: 3, fontSize: 7, fontWeight: 600,
          background: card.difficulty === 'Beginner' ? 'rgba(34,197,94,0.15)' :
                       card.difficulty === 'Intermediate' ? 'rgba(245,158,11,0.15)' :
                       'rgba(239,68,68,0.15)',
          color: card.difficulty === 'Beginner' ? '#22c55e' :
                 card.difficulty === 'Intermediate' ? '#f59e0b' :
                 '#ef4444',
        }}>
          {card.difficulty}
        </span>
      </div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10, marginBottom: 3 }}>{card.name}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 8, marginBottom: 6, lineHeight: 1.4 }}>{card.description}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        <Tag label={card.type} color="#3b82f6" />
        <Tag label={card.timeHorizon} color="#8b5cf6" />
      </div>
      {expanded && (
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 8, marginBottom: 2 }}>{card.returnProfile}</div>
          <div style={{ marginTop: 4 }}>
            <div style={{ color: '#22c55e', fontSize: 8, fontWeight: 600, marginBottom: 2 }}>Pros</div>
            {card.pros.map((p, i) => <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 8, paddingLeft: 8 }}>• {p}</div>)}
          </div>
          <div style={{ marginTop: 4 }}>
            <div style={{ color: '#ef4444', fontSize: 8, fontWeight: 600, marginBottom: 2 }}>Cons</div>
            {card.cons.map((c, i) => <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 8, paddingLeft: 8 }}>• {c}</div>)}
          </div>
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          marginTop: 6, padding: '2px 8px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--border-color, #1a2332)',
          color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', width: '100%',
        }}
      >
        {expanded ? 'Show Less' : 'Show More'}
      </button>
    </div>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: '1px 5px', borderRadius: 3, fontSize: 7, fontWeight: 600,
      background: `${color}15`, color,
    }}>
      {label}
    </span>
  )
}
