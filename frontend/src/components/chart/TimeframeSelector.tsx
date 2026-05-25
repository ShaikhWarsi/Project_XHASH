interface TimeframeSelectorProps {
  interval: string
  onIntervalChange: (interval: string) => void
}

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '60m' },
  { label: '4h', value: '240m' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1wk' },
  { label: '1M', value: '1mo' },
]

export function TimeframeSelector({ interval, onIntervalChange }: TimeframeSelectorProps) {
  return (
    <div style={{
      display: 'flex', gap: '1px',
      padding: '0 4px',
      background: 'var(--bg-card, #0d1117)',
    }}>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onIntervalChange(tf.value)}
          title={tf.label}
          style={{
            background: interval === tf.value ? 'var(--accent-cyan, #3b82f6)' : 'transparent',
            color: interval === tf.value ? '#fff' : 'var(--text-secondary, #5d6b7e)',
            border: 'none', borderRadius: '2px',
            padding: '2px 6px', cursor: 'pointer',
            fontSize: '10px', fontFamily: 'JetBrains Mono, monospace',
            lineHeight: '20px',
          }}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
