import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'

export class LongMarker extends DrawingTool {
  static readonly pointCount = 1
  get pointCount() { return LongMarker.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 1) return
    const x = mapper.timeToX(this.points[0].time)
    const y = mapper.priceToY(this.points[0].price, paneIndex)
    if (x == null || y == null) return

    // Draw an upward arrow below the bar
    const size = 8

    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.moveTo(x, y + size)
    ctx.lineTo(x - size / 2, y)
    ctx.lineTo(x + size / 2, y)
    ctx.closePath()
    ctx.fill()

    // Label
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.fillStyle = '#22c55e'
    ctx.fillText('LONG', x + 6, y + 4)

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, x, y + size / 2, '#22c55e', this.isSelected)
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
