interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

const COLORS = {
  default: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)' },
  success: { bg: 'rgba(34,197,94,0.15)', text: 'var(--accent-green)' },
  warning: { bg: 'rgba(234,179,8,0.15)', text: 'var(--accent-yellow)' },
  error: { bg: 'rgba(239,68,68,0.15)', text: 'var(--accent-red)' },
  info: { bg: 'rgba(59,130,246,0.15)', text: 'var(--accent-blue)' },
}

export default function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const c = COLORS[variant]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '1px 6px' : '2px 8px',
        fontSize: size === 'sm' ? 9 : 10,
        fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        background: c.bg,
        color: c.text,
        borderRadius: 'var(--radius-sm)',
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  )
}
