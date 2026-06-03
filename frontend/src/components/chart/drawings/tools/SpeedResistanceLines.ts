import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD, distToSegment } from '../Utils'

const SPEED_COLORS = ['#3b82f6', '#22c55e', '#a855f7']

export class SpeedResistanceLines extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return SpeedResistanceLines.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    const startY = y1
    const startX = x1
    let endX = x2
    let endY = y2

    const extendFactor = 3
    const projX = startX + (endX - startX) * extendFactor
    const projY = startY + (endY - startY) * extendFactor

    ctx.save()

    ctx.strokeStyle = this.style.color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(projX, projY)
    ctx.stroke()

    const dy = projY - startY
    const thirds = [1/3, 2/3]
    const labels = ['1/3', '2/3']

    for (let i = 0; i < thirds.length; i++) {
      const speedEndY = startY + dy * thirds[i]

      ctx.strokeStyle = SPEED_COLORS[i]
      ctx.lineWidth = 0.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(projX, speedEndY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillStyle = SPEED_COLORS[i]
      ctx.fillText(labels[i], projX + 4, speedEndY)
    }

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

    const extendFactor = 3
    const projX = x1 + (x2 - x1) * extendFactor
    const projY = y1 + (y2 - y1) * extendFactor
    const dy = projY - y1
    const thirds = [0, 1/3, 2/3, 1]

    for (const t of thirds) {
      const endY = y1 + dy * t
      if (distToSegment({ x, y }, { x: x1, y: y1 }, { x: projX, y: endY }) < HIT_THRESHOLD) {
        return true
      }
    }
    return false
  }
}
