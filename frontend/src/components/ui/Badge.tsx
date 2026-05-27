interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

const COLORS = {
  default: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)' },
  success: { bg: 'color-mix(in srgb, var(--accent-green) 15%, transparent)', text: 'var(--accent-green)' },
  warning: { bg: 'color-mix(in srgb, var(--accent-yellow) 15%, transparent)', text: 'var(--accent-yellow)' },
  error: { bg: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', text: 'var(--accent-red)' },
  info: { bg: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', text: 'var(--accent-blue)' },
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
