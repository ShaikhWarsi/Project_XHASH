import { X } from 'lucide-react'

interface Condition {
  id: string
  source: 'indicator' | 'price' | 'volume' | 'signal'
  indicator: string
  operator: '>' | '<' | '>=' | '<=' | '==' | 'crosses_above' | 'crosses_below'
  value: string
  targetSource?: string
  logic?: 'AND' | 'OR'
}

interface StrategyConditionProps {
  condition: Condition
  index: number
  onChange: (id: string, updates: Partial<Condition>) => void
  onRemove: (id: string) => void
  showLogic?: boolean
}

export default function StrategyCondition({ condition, index, onChange, onRemove, showLogic }: StrategyConditionProps) {
  const sources = [
    { value: 'price', label: 'Price' },
    { value: 'indicator', label: 'Indicator' },
    { value: 'volume', label: 'Volume' },
    { value: 'signal', label: 'Signal' },
  ]

  const indicators = [
    { value: 'sma', label: 'SMA' },
    { value: 'ema', label: 'EMA' },
    { value: 'rsi', label: 'RSI' },
    { value: 'macd', label: 'MACD' },
    { value: 'bb', label: 'Bollinger Bands' },
    { value: 'atr', label: 'ATR' },
    { value: 'stoch', label: 'Stochastic' },
    { value: 'adx', label: 'ADX' },
  ]

  const operators = [
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: '==', label: '==' },
    { value: 'crosses_above', label: 'Crosses Above' },
    { value: 'crosses_below', label: 'Crosses Below' },
  ]

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 6px',
    fontSize: '11px',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '8px' }}>
      <div className="flex items-center gap-2 flex-wrap">
        {showLogic && index > 0 && (
          <select
            value={condition.logic || 'AND'}
            onChange={(e) => onChange(condition.id, { logic: e.target.value as 'AND' | 'OR' })}
            style={{ ...inputStyle, fontWeight: 700, width: 56, textTransform: 'uppercase', fontSize: '10px' }}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        )}
        <select
          value={condition.source}
          onChange={(e) => onChange(condition.id, { source: e.target.value as Condition['source'] })}
          style={{ ...inputStyle, width: 80 }}
        >
          {sources.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {condition.source === 'indicator' && (
          <select
            value={condition.indicator}
            onChange={(e) => onChange(condition.id, { indicator: e.target.value })}
            style={{ ...inputStyle, width: 100 }}
          >
            {indicators.map((ind) => (
              <option key={ind.value} value={ind.value}>{ind.label}</option>
            ))}
          </select>
        )}
        <select
          value={condition.operator}
          onChange={(e) => onChange(condition.id, { operator: e.target.value as Condition['operator'] })}
          style={{ ...inputStyle, width: 100 }}
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        <input
          value={condition.value}
          onChange={(e) => onChange(condition.id, { value: e.target.value })}
          placeholder={condition.source === 'indicator' ? '14' : '50'}
          style={{ ...inputStyle, width: 60 }}
        />
        <button
          onClick={() => onRemove(condition.id)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 4 }}
          title="Remove condition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
