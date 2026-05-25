import { DrawingTool } from '../DrawingTool'
import { drawControlHandle } from '../Utils'

export class Parallelogram extends DrawingTool {
  static readonly pointCount = 3
  get pointCount() { return Parallelogram.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 3) return
    const coords = this.points.map((p) => ({
      x: mapper.timeToX(p.time),
      y: mapper.priceToY(p.price, paneIndex),
    }))
    if (coords.some((c) => c.x == null || c.y == null)) return

    const [a, b, c] = coords as { x: number; y: number }[]
    const d = { x: a.x + (c.x - b.x), y: a.y + (c.y - b.y) }

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(d.x, d.y)
    ctx.lineTo(c.x, c.y)
    ctx.closePath()

    ctx.fillStyle = this.style.fillColor || this.style.color
    ctx.globalAlpha = this.style.fillOpacity ?? 0.15
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.isSelected ? this.style.width + 1 : this.style.width
    ctx.stroke()

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
    const d = { x: a.x + (c.x - b.x), y: a.y + (c.y - b.y) }
    const minX = Math.min(a.x, b.x, c.x, d.x)
    const maxX = Math.max(a.x, b.x, c.x, d.x)
    const minY = Math.min(a.y, b.y, c.y, d.y)
    const maxY = Math.max(a.y, b.y, c.y, d.y)
    return x >= minX && x <= maxX && y >= minY && y <= maxY
  }
}
