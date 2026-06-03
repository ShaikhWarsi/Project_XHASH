import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'

function formatTimeDelta(t1: any, t2: any): string {
  const d1 = new Date(String(t1))
  const d2 = new Date(String(t2))
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return ''
  const ms = Math.abs(d2.getTime() - d1.getTime())
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  return parts.join(' ') || `${Math.floor(ms / 1000)}s`
}

export class RulerTool extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return RulerTool.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    const priceDiff = this.points[1].price - this.points[0].price
    const absPriceDiff = Math.abs(priceDiff)
    const midPrice = (this.points[0].price + this.points[1].price) / 2
    const pctChange = midPrice !== 0 ? (absPriceDiff / Math.abs(midPrice)) * 100 : 0
    const angle = Math.atan2(Math.abs(y2 - y1), Math.abs(x2 - x1)) * (180 / Math.PI)
    const timeDelta = formatTimeDelta(this.points[0].time, this.points[1].time)

    const lx = Math.min(x1, x2)
    const rx = Math.max(x1, x2)
    const ty = Math.min(y1, y2)
    const by = Math.max(y1, y2)
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2

    ctx.save()
    ctx.globalAlpha = this.style.opacity

    // Diagonal line
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.isSelected ? this.style.width + 1 : this.style.width
    ctx.stroke()
    ctx.setLineDash([])

    // Dashed bounding box
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = 1
    ctx.globalAlpha = this.style.opacity * 0.5
    ctx.strokeRect(lx, ty, rx - lx, by - ty)
    ctx.globalAlpha = this.style.opacity

    // Price delta label
    const isUp = priceDiff >= 0
    const changeColor = isUp ? '#22c55e' : '#ef4444'
    ctx.font = '10px JetBrains Mono, monospace'
    ctx.fillStyle = changeColor
    const sign = isUp ? '+' : ''
    const changeLabel = `${sign}${absPriceDiff.toFixed(2)} (${sign}${pctChange.toFixed(2)}%)`
    ctx.fillText(changeLabel, midX + 8, midY - 6)

    // Time delta label
    ctx.fillStyle = '#94a3b8'
    ctx.font = '8px JetBrains Mono, monospace'
    if (timeDelta) {
      ctx.fillText(`Δ ${timeDelta}`, midX + 8, midY + 6)
    }

    // Angle label
    ctx.fillText(`${angle.toFixed(1)}°`, midX + 8, midY + 16)

    // Horizontal distance: price diff + time
    const topLabelY = ty - 8
    ctx.beginPath()
    ctx.moveTo(lx, ty)
    ctx.lineTo(lx, topLabelY)
    ctx.moveTo(rx, ty)
    ctx.lineTo(rx, topLabelY)
    ctx.moveTo(lx, topLabelY)
    ctx.lineTo(rx, topLabelY)
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.font = '8px JetBrains Mono, monospace'
    const hLabel = `${absPriceDiff.toFixed(2)}`
    const hLabelW = ctx.measureText(hLabel).width
    ctx.fillText(hLabel, (lx + rx) / 2 - hLabelW / 2, topLabelY - 2)

    // Vertical distance: pct change
    const rightLabelX = rx + 6
    ctx.beginPath()
    ctx.moveTo(rx, ty)
    ctx.lineTo(rightLabelX, ty)
    ctx.moveTo(rx, by)
    ctx.lineTo(rightLabelX, by)
    ctx.moveTo(rightLabelX, ty)
    ctx.lineTo(rightLabelX, by)
    ctx.stroke()

    ctx.save()
    ctx.translate(rightLabelX + 2, (ty + by) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    const vLabel = `${pctChange.toFixed(1)}%`
    ctx.fillText(vLabel, 0, 0)
    ctx.restore()

    ctx.restore()

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, x1, y1, this.style.color, this.isSelected)
      drawControlHandle(ctx, x2, y2, this.style.color, this.isSelected)
    }
  }

  hitTest(x: number, y: number, mapper: any, paneIndex: number): boolean {
    if (this.points.length < 2) return false
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return false

    const lx = Math.min(x1, x2)
    const rx = Math.max(x1, x2)
    const ty = Math.min(y1, y2)
    const by = Math.max(y1, y2)
    return x >= lx - HIT_THRESHOLD && x <= rx + HIT_THRESHOLD && y >= ty - HIT_THRESHOLD && y <= by + HIT_THRESHOLD
  }
}
