import type { Time } from 'lightweight-charts'
import { computeIchimoku } from '../drawings/indicators/compute/ichimoku'
import type { IndicatorInput } from '../drawings/indicators/compute/types'

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

interface RenderLayout {
  width: number
  height: number
  padding: { top: number; bottom: number; left: number; right: number }
}

export function renderIchimokuCloud(
  ctx: CanvasRenderingContext2D,
  data: IndicatorInput[],
  mapper: CoordMapper,
  layout: RenderLayout,
  shift: number = 26
): void {
  if (data.length < shift) return

  const ichi = computeIchimoku(data)
  if (ichi.length < shift) return

  ctx.save()

  const cloudPoints: { x: number; yA: number; yB: number; bull: boolean }[] = []

  for (let i = shift; i < ichi.length; i++) {
    const idx = i - shift
    const senkouA = ichi[idx].value3
    const senkouB = ichi[idx].value4
    if (senkouA == null || senkouB == null) continue

    const time = ichi[i].time
    const x = mapper.timeToX(time as Time)
    if (x == null) continue

    const yA = mapper.priceToY(senkouA)
    const yB = mapper.priceToY(senkouB)
    if (yA == null || yB == null) continue

    cloudPoints.push({ x, yA, yB, bull: senkouA > senkouB })
  }

  if (cloudPoints.length < 2) {
    ctx.restore()
    return
  }

  for (let i = 0; i < cloudPoints.length - 1; i++) {
    const c = cloudPoints[i]
    const n = cloudPoints[i + 1]

    ctx.beginPath()
    ctx.moveTo(c.x, c.yA)
    ctx.lineTo(n.x, n.yA)
    ctx.lineTo(n.x, n.yB)
    ctx.lineTo(c.x, c.yB)
    ctx.closePath()

    ctx.fillStyle = c.bull ? 'rgba(38,166,154,0.15)' : 'rgba(239,83,80,0.15)'
    ctx.fill()

    ctx.strokeStyle = c.bull ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  for (let i = 0; i < cloudPoints.length; i++) {
    const c = cloudPoints[i]
    ctx.strokeStyle = c.bull ? '#26a69a' : '#ef5350'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(c.x, c.yA)
    ctx.lineTo(c.x + 1, c.yA)
    ctx.stroke()
  }

  ctx.restore()
}
