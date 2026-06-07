interface ProgressBarProps {
  value: number
  max: number
  label?: string
  showPercent?: boolean
  height?: number
  color?: string
}

export default function ProgressBar({
  value, max, label, showPercent = true, height = 4, color,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex flex-col gap-0.5" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono-data text-muted">{label}</span>
          {showPercent && <span className="text-[9px] font-mono-data text-accent-cyan">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ background: 'var(--bg-hover)', height }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: color || 'var(--accent-cyan)',
          }}
        />
      </div>
    </div>
  )
}
