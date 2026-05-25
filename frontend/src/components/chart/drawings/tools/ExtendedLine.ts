import { DrawingTool } from '../DrawingTool'
import { distToSegment, drawControlHandle, HIT_THRESHOLD } from '../Utils'

export class ExtendedLine extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return ExtendedLine.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    const dx = x2 - x1
    const dy = y2 - y1
    const chartW = mapper.getWidth?.() ?? 1000
    const t1 = dx !== 0 ? -x1 / dx : 1
    const t2 = dx !== 0 ? (chartW - x1) / dx : 1
    const startX = x1 + dx * t1
    const startY = y1 + dy * t1
    const endX = x1 + dx * t2
    const endY = y1 + dy * t2

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
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
    const dx = x2 - x1
    const dy = y2 - y1
    const chartW = mapper.getWidth?.() ?? 1000
    const t1 = dx !== 0 ? -x1 / dx : 1
    const t2 = dx !== 0 ? (chartW - x1) / dx : 1
    const startX = x1 + dx * t1
    const startY = y1 + dy * t1
    const endX = x1 + dx * t2
    const endY = y1 + dy * t2
    return distToSegment({ x, y }, { x: startX, y: startY }, { x: endX, y: endY }) < HIT_THRESHOLD
  }
}
