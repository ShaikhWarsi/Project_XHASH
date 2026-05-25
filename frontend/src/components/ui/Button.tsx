import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
  children: ReactNode
}

export default function Button({ variant = 'primary', size = 'md', loading, children, style, disabled, ...props }: ButtonProps) {
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent-cyan)', color: '#000', border: 'none' },
    secondary: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' },
    danger: { background: 'var(--accent-red)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
  }
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 10px', fontSize: 'var(--font-size-xs)' },
    md: { padding: '8px 16px', fontSize: 'var(--font-size-sm)' },
  }
  return (
    <button
      disabled={disabled || loading}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.5 : 1,
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {loading ? '...' : children}
    </button>
  )
}
