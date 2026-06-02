import type { Time } from 'lightweight-charts'
import type { ChartThemeColors } from '../ChartTheme'

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

interface FVG {
  top: number
  bottom: number
  startTime: Time
  endTime: Time
  direction: string
}

interface OrderBlock {
  level: number
  direction: string
  confidence: number
  time: Time
}

interface LiquidityLevel {
  level: number
  direction: string
  confidence: number
}

export function renderFVG(
  ctx: CanvasRenderingContext2D,
  fvg: FVG,
  mapper: CoordMapper,
  canvasWidth: number,
  theme: ChartThemeColors
): void {
  ctx.save()

  const yTop = mapper.priceToY(fvg.top)
  const yBottom = mapper.priceToY(fvg.bottom)
  if (yTop == null || yBottom == null) {
    ctx.restore()
    return
  }

  const y1 = Math.min(yTop, yBottom)
  const y2 = Math.max(yTop, yBottom)
  const height = y2 - y1
  const isBull = fvg.direction === 'bullish' || fvg.direction === 'up'
  const baseColor = isBull ? theme.up : theme.down

  const gradient = ctx.createLinearGradient(0, y1, 0, y2)
  gradient.addColorStop(0, baseColor + '00')
  gradient.addColorStop(0.3, baseColor + '30')
  gradient.addColorStop(0.5, baseColor + '50')
  gradient.addColorStop(0.7, baseColor + '30')
  gradient.addColorStop(1, baseColor + '00')
  ctx.fillStyle = gradient
  ctx.fillRect(0, y1, canvasWidth, height)

  ctx.save()
  ctx.shadowColor = baseColor + '40'
  ctx.shadowBlur = 8
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = baseColor + '99'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, y1)
  ctx.lineTo(canvasWidth, y1)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, y2)
  ctx.lineTo(canvasWidth, y2)
  ctx.stroke()
  ctx.restore()

  ctx.setLineDash([])
  ctx.font = '9px JetBrains Mono, monospace'
  ctx.fillStyle = baseColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('FVG', 4, y1 - 2)

  ctx.fillStyle = theme.text
  ctx.font = '8px JetBrains Mono, monospace'
  ctx.textBaseline = 'top'
  ctx.fillText(fvg.top.toFixed(2), 4, y1 + 2)
  ctx.textBaseline = 'bottom'
  ctx.fillText(fvg.bottom.toFixed(2), 4, y2 - 2)

  ctx.restore()
}

export function renderOrderBlock(
  ctx: CanvasRenderingContext2D,
  ob: OrderBlock,
  mapper: CoordMapper,
  canvasWidth: number,
  theme: ChartThemeColors
): void {
  ctx.save()

  const y = mapper.priceToY(ob.level)
  if (y == null) {
    ctx.restore()
    return
  }

  const isBull = ob.direction === 'bullish' || ob.direction === 'up'
  const baseColor = isBull ? theme.up : theme.down
  const bandHeight = Math.max(4, Math.min(16, ob.confidence * 16))

  const gradient = ctx.createLinearGradient(0, y - bandHeight / 2, 0, y + bandHeight / 2)
  gradient.addColorStop(0, baseColor + '00')
  gradient.addColorStop(0.5, baseColor + '60')
  gradient.addColorStop(1, baseColor + '00')
  ctx.fillStyle = gradient
  ctx.fillRect(0, y - bandHeight / 2, canvasWidth, bandHeight)

  if (ob.confidence > 0.7) {
    ctx.save()
    ctx.shadowColor = baseColor + '60'
    ctx.shadowBlur = 12
    ctx.strokeStyle = baseColor + '30'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()
    ctx.restore()
  }

  ctx.font = '9px JetBrains Mono, monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  const label = `OB $${ob.level.toFixed(2)} ${(ob.confidence * 100).toFixed(0)}%`
  const metrics = ctx.measureText(label)
  const labelPadding = 4
  const labelWidth = metrics.width + labelPadding * 2
  const labelX = canvasWidth - 4
  const labelY = y - bandHeight / 2 - 10

  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(labelX - labelWidth, labelY - 7, labelWidth, 14)

  ctx.fillStyle = theme.textPrimary
  ctx.fillText(label, labelX, labelY)

  ctx.restore()
}

export function renderLiquidityLevel(
  ctx: CanvasRenderingContext2D,
  liq: LiquidityLevel,
  mapper: CoordMapper,
  canvasWidth: number,
  theme: ChartThemeColors,
  time: number
): void {
  ctx.save()

  const y = mapper.priceToY(liq.level)
  if (y == null) {
    ctx.restore()
    return
  }

  const pulse = Math.sin(time * 0.003) * 0.3 + 0.4
  ctx.globalAlpha = pulse

  ctx.setLineDash([6, 4])
  ctx.strokeStyle = theme.accentYellow
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(canvasWidth, y)
  ctx.stroke()
  ctx.setLineDash([])

  const dotSpacing = 40
  for (let dx = 0; dx < canvasWidth; dx += dotSpacing) {
    ctx.beginPath()
    ctx.arc(dx, y, 2, 0, Math.PI * 2)
    ctx.fillStyle = theme.accentYellow
    ctx.fill()
  }

  ctx.globalAlpha = 1
  ctx.font = '9px JetBrains Mono, monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = theme.textPrimary
  ctx.fillText(`$${liq.level.toFixed(2)} ${(liq.confidence * 100).toFixed(0)}%`, canvasWidth - 4, y)

  ctx.restore()
}

export function renderKeyLevels(
  ctx: CanvasRenderingContext2D,
  levels: number[],
  mapper: CoordMapper,
  canvasWidth: number,
  theme: ChartThemeColors
): void {
  ctx.save()

  ctx.globalAlpha = 0.15
  ctx.strokeStyle = theme.text
  ctx.lineWidth = 0.5

  ctx.font = '8px JetBrains Mono, monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'

  for (const level of levels) {
    const y = mapper.priceToY(level)
    if (y == null) continue

    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()

    ctx.fillStyle = theme.text
    ctx.globalAlpha = 0.4
    ctx.fillText(level.toFixed(2), canvasWidth - 2, y - 1)
    ctx.globalAlpha = 0.15
  }

  ctx.globalAlpha = 1
  ctx.restore()
}
