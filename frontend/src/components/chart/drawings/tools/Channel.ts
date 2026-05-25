import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD, distToSegment } from '../Utils'

export class Channel extends DrawingTool {
  static readonly pointCount = 3
  get pointCount() { return Channel.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 3) return
    const coords = this.points.map((p) => ({
      x: mapper.timeToX(p.time),
      y: mapper.priceToY(p.price, paneIndex),
    }))
    if (coords.some((c) => c.x == null || c.y == null)) return

    const [a, b, c] = coords as { x: number; y: number }[]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = { x: c.x + dx, y: c.y + dy }

    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.isSelected ? this.style.width + 1 : this.style.width
    ctx.globalAlpha = this.style.opacity
    ctx.setLineDash([4, 2])
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(c.x, c.y)
    ctx.lineTo(d.x, d.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    if (this.isSelected || this.isHovered) {
      for (const p of [a, b, c]) {
        drawControlHandle(ctx, p.x, p.y, this.style.color, this.isSelected)
      }
    }
  }

  hitTest(x: number, y: number, mapper: any, paneIndex: number): boolean {
    if (this.points.length < 3) return false
    const coords = this.points.map((p) => ({
      x: mapper.timeToX(p.time),
      y: mapper.priceToY(p.price, paneIndex),
    })) as { x: number; y: number }[]
    if (coords.some((c) => c.x == null || c.y == null)) return false

    const [a, b, c] = coords
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = { x: c.x + dx, y: c.y + dy }

    const d1 = distToSegment({ x, y }, a, b)
    const d2 = distToSegment({ x, y }, c, d)
    return Math.min(d1, d2) < HIT_THRESHOLD * 2
  }
}
