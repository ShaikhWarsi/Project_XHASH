import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'

export class VerticalLine extends DrawingTool {
  static readonly pointCount = 1
  get pointCount() { return VerticalLine.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 1) return
    const x = mapper.timeToX(this.points[0].time)
    if (x == null) return
    const h = mapper.getPaneHeight?.(paneIndex) ?? 300

    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.isSelected ? this.style.width + 1 : this.style.width
    ctx.globalAlpha = this.style.opacity
    ctx.stroke()
    ctx.globalAlpha = 1

    if (this.isSelected || this.isHovered) {
      const y = mapper.priceToY(this.points[0].price, paneIndex) ?? 0
      drawControlHandle(ctx, x, y, this.style.color, this.isSelected)
    }
  }

  hitTest(x: number, _y: number, mapper: any, _paneIndex: number): boolean {
    if (this.points.length < 1) return false
    const px = mapper.timeToX(this.points[0].time)
    if (px == null) return false
    return Math.abs(x - px) < HIT_THRESHOLD
  }
}
