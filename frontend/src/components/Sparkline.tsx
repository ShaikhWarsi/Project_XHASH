export default function Sparkline({ data, up, width = 40, height = 16 }: { data: number[]; up?: boolean; width?: number; height?: number }) {
  if (!data) return null
  const clean = data.filter((v) => v != null && !Number.isNaN(v) && isFinite(v))
  if (clean.length < 2) return null
  const min = Math.min(...clean); const max = Math.max(...clean)
  const range = max - min || 1
  const color = up != null ? (up ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--accent-cyan)'
  const points = clean.map((v, i) => {
    const x = (i / (clean.length - 1)) * (width - 2) + 1
    const y = height - 1 - ((v - min) / range) * (height - 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}
