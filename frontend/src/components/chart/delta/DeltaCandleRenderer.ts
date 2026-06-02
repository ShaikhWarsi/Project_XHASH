import type { Time } from 'lightweight-charts'
import type { DeltaBar } from './DeltaCalculator'
import { getDeltaColor } from './DeltaCalculator'

export interface RenderLayout {
  width: number
  height: number
  padding: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function renderDeltaCandles(
  ctx: CanvasRenderingContext2D,
  data: DeltaBar[],
  layout: RenderLayout,
  mapper: CoordMapper
): void {
  ctx.save()

  const { width, height, padding } = layout
  const chartLeft = padding.left
  const chartRight = width - padding.right
  const chartWidth = chartRight - chartLeft
  const count = data.length
  if (count === 0) {
    ctx.restore()
    return
  }

  const candleWidth = Math.max(2, Math.min(15, chartWidth / count - 1))
  const halfWidth = candleWidth / 2

  for (const bar of data) {
    const x = mapper.timeToX(bar.time)
    const yOpen = mapper.priceToY(bar.open)
    const yHigh = mapper.priceToY(bar.high)
    const yLow = mapper.priceToY(bar.low)
    const yClose = mapper.priceToY(bar.close)

    if (x == null || yOpen == null || yHigh == null || yLow == null || yClose == null) continue

    const color = getDeltaColor(bar.delta, bar.cumulativeDelta, bar.buyRatio)
    const bodyTop = Math.min(yOpen, yClose)
    const bodyBottom = Math.max(yOpen, yClose)
    const bodyHeight = Math.max(1, bodyBottom - bodyTop)

    ctx.strokeStyle = hexToRgba(color, 0.7)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, yHigh)
    ctx.lineTo(x, yLow)
    ctx.stroke()

    ctx.fillStyle = color
    ctx.fillRect(x - halfWidth, bodyTop, candleWidth, bodyHeight)

    const isHighConv = Math.abs(bar.delta) > bar.volume * 0.3
    if (isHighConv) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, yClose, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

export function renderVolumeDeltas(
  ctx: CanvasRenderingContext2D,
  data: DeltaBar[],
  layout: RenderLayout,
  mapper: CoordMapper
): void {
  ctx.save()

  const { width, height, padding } = layout
  const chartLeft = padding.left
  const chartRight = width - padding.right
  const chartWidth = chartRight - chartLeft
  const barAreaHeight = 60
  const barAreaTop = height - padding.bottom - barAreaHeight
  const count = data.length
  if (count === 0) {
    ctx.restore()
    return
  }

  const maxVolume = Math.max(...data.map((b) => b.volume), 1)
  const barWidth = Math.max(1, Math.min(10, chartWidth / count - 1))
  const halfBar = barWidth / 2

  for (const bar of data) {
    const x = mapper.timeToX(bar.time)
    if (x == null) continue

    const barHeight = (bar.volume / maxVolume) * barAreaHeight
    const y = barAreaTop + barAreaHeight - barHeight
    const color = getDeltaColor(bar.delta, bar.cumulativeDelta, bar.buyRatio)
    ctx.fillStyle = color
    ctx.fillRect(x - halfBar, y, barWidth, barHeight)
  }

  const maxCumulative = Math.max(...data.map((b) => Math.abs(b.cumulativeDelta)), 1)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < data.length; i++) {
    const x = mapper.timeToX(data[i].time)
    if (x == null) continue
    const normalized = (data[i].cumulativeDelta / maxCumulative) * (barAreaHeight / 2) * 0.8
    const cy = barAreaTop + barAreaHeight / 2 - normalized
    if (i === 0) ctx.moveTo(x, cy)
    else ctx.lineTo(x, cy)
  }
  ctx.stroke()

  ctx.restore()
}
