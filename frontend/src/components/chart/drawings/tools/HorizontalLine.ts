import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'

export class HorizontalLine extends DrawingTool {
  static readonly pointCount = 1
  get pointCount() { return HorizontalLine.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 1) return
    const y = mapper.priceToY(this.points[0].price, paneIndex)
    if (y == null) return
    const w = mapper.getWidth?.() ?? 1000
    const x = this.points[0].time ? (mapper.timeToX(this.points[0].time) ?? 0) : 0

    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.isSelected ? this.style.width + 1 : this.style.width
    ctx.globalAlpha = this.style.opacity
    ctx.stroke()
    ctx.globalAlpha = 1

    // Price label on the right
    ctx.font = '10px JetBrains Mono, monospace'
    const label = this.points[0].price.toFixed(2)
    ctx.fillStyle = this.style.color
    ctx.fillText(label, w - ctx.measureText(label).width - 6, y - 6)

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, x, y, this.style.color, this.isSelected)
    }
  }

  hitTest(_x: number, y: number, mapper: any, paneIndex: number): boolean {
    if (this.points.length < 1) return false
    const py = mapper.priceToY(this.points[0].price, paneIndex)
    if (py == null) return false
    return Math.abs(y - py) < HIT_THRESHOLD
  }
}
