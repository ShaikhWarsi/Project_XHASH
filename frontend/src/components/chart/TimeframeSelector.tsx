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
  { label: '1W', value: '7d' },
  { label: '1M', value: '30d' },
]

export function TimeframeSelector({ interval, onIntervalChange }: TimeframeSelectorProps) {
  return (
    <div style={{
      display: 'flex', gap: '1px',
      padding: '0 4px',
      background: 'var(--bg-card, #0d1117)',
      borderRadius: '3px',
      overflow: 'hidden',
    }}>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onIntervalChange(tf.value)}
          title={tf.label}
          style={{
            background: interval === tf.value
              ? 'var(--accent-cyan, #3b82f6)'
              : 'transparent',
            color: interval === tf.value ? '#000' : 'var(--text-secondary, #5d6b7e)',
            border: 'none',
            padding: '2px 7px',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            lineHeight: '20px',
            fontWeight: interval === tf.value ? 600 : 400,
            transition: 'background 0.12s, color 0.12s',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (interval !== tf.value) {
              e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.05))'
            }
          }}
          onMouseLeave={(e) => {
            if (interval !== tf.value) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
