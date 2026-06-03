import type { Time } from 'lightweight-charts'
import type { IndicatorInput } from '../drawings/indicators/compute/types'
import { computePivots, type PivotType } from '../drawings/indicators/compute/pivots'

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

const PIVOT_COLORS = {
  pivot: '#22c55e',
  r1: '#3b82f6',
  r2: '#a855f7',
  r3: '#ef4444',
  s1: '#3b82f6',
  s2: '#a855f7',
  s3: '#ef4444',
}

const PIVOT_LABELS = ['R3', 'R2', 'R1', 'PIVOT', 'S1', 'S2', 'S3']

export function renderPivotLevels(
  ctx: CanvasRenderingContext2D,
  data: IndicatorInput[],
  mapper: CoordMapper,
  canvasWidth: number,
  type: PivotType = 'standard'
): void {
  if (data.length < 2) return

  const pivots = computePivots(data, type)
  if (pivots.length < 2) return

  const lastPivot = pivots[pivots.length - 1]
  const levels = [
    { value: lastPivot.value4, key: 'r2' as const },
    { value: lastPivot.value2, key: 'r1' as const },
    { value: lastPivot.value1, key: 'pivot' as const },
    { value: lastPivot.value3, key: 's1' as const },
    { value: lastPivot.value5, key: 's2' as const },
  ]

  ctx.save()

  ctx.font = '9px JetBrains Mono, monospace'

  for (const level of levels) {
    if (level.value == null || isNaN(level.value)) continue
    const y = mapper.priceToY(level.value)
    if (y == null) continue

    const color = PIVOT_COLORS[level.key]
    const labelIdx = { r2: 1, r1: 2, pivot: 3, s1: 4, s2: 5 }[level.key]
    const label = PIVOT_LABELS[labelIdx]

    ctx.strokeStyle = color
    ctx.globalAlpha = 0.3
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    ctx.fillStyle = color
    ctx.textAlign = 'left'
    ctx.fillText(`${label} ${level.value.toFixed(2)}`, 4, y - 3)
  }

  ctx.restore()
}
