import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD, distToSegment } from '../Utils'
import { FIB_COLORS } from '../../DrawingTypes'

export class GannFan extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return GannFan.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    const dx = x2 - x1
    const dy = y2 - y1
    const angles = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 1, 1.33, 2, 4]

    for (let i = 0; i < angles.length; i++) {
      const a = angles[i]
      const endX = x1 + dx * 3
      const endY = y1 + dy * a * 3

      ctx.strokeStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.fillText(a + 'x', endX + 2, endY)
    }

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
    
    const dx = x2 - x1
    const dy = y2 - y1
    const angles = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 1, 1.33, 2, 4]
    
    for (const a of angles) {
      const endX = x1 + dx * 3
      const endY = y1 + dy * a * 3
      if (distToSegment({ x, y }, { x: x1, y: y1 }, { x: endX, y: endY }) < HIT_THRESHOLD) {
        return true
      }
    }
    return false
  }
}
