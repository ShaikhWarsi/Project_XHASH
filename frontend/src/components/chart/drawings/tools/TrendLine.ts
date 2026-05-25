import { DrawingTool } from '../DrawingTool'
import { distToSegment, drawControlHandle, HIT_THRESHOLD } from '../Utils'

export class TrendLine extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return TrendLine.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.isSelected ? this.style.width + 1 : this.style.width
    ctx.globalAlpha = this.style.opacity
    ctx.stroke()
    ctx.globalAlpha = 1

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
    return distToSegment({ x, y }, { x: x1, y: y1 }, { x: x2, y: y2 }) < HIT_THRESHOLD
  }

  getBounds() {
    if (this.points.length < 2) return null
    return { left: 0, top: 0, right: 0, bottom: 0 }
  }
}
