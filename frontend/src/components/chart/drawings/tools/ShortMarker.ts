import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'

export class ShortMarker extends DrawingTool {
  static readonly pointCount = 1
  get pointCount() { return ShortMarker.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 1) return
    const x = mapper.timeToX(this.points[0].time)
    const y = mapper.priceToY(this.points[0].price, paneIndex)
    if (x == null || y == null) return

    // Draw a downward arrow above the bar
    const size = 8

    ctx.fillStyle = '#ef5350'
    ctx.beginPath()
    ctx.moveTo(x, y - size)
    ctx.lineTo(x - size / 2, y)
    ctx.lineTo(x + size / 2, y)
    ctx.closePath()
    ctx.fill()

    // Label
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.fillStyle = '#ef5350'
    ctx.fillText('SHORT', x + 6, y - 2)

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, x, y - size / 2, '#ef5350', this.isSelected)
    }
  }

  hitTest(x: number, y: number, mapper: any, paneIndex: number): boolean {
    if (this.points.length < 1) return false
    const px = mapper.timeToX(this.points[0].time)
    const py = mapper.priceToY(this.points[0].price, paneIndex)
    if (px == null || py == null) return false
    return Math.abs(x - px) < HIT_THRESHOLD && Math.abs(y - py) < HIT_THRESHOLD * 2
  }
}
