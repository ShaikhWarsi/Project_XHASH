import { DrawingTool } from '../DrawingTool'
import { drawControlHandle } from '../Utils'

export class Triangle extends DrawingTool {
  static readonly pointCount = 3
  get pointCount() { return Triangle.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 3) return
    const coords = this.points.map((p) => ({
      x: mapper.timeToX(p.time),
      y: mapper.priceToY(p.price, paneIndex),
    }))
    if (coords.some((c) => c.x == null || c.y == null)) return

    ctx.beginPath()
    ctx.moveTo(coords[0].x!, coords[0].y!)
    ctx.lineTo(coords[1].x!, coords[1].y!)
    ctx.lineTo(coords[2].x!, coords[2].y!)
    ctx.closePath()

    ctx.fillStyle = this.style.fillColor || this.style.color
    ctx.globalAlpha = this.style.fillOpacity ?? 0.15
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.isSelected ? this.style.width + 1 : this.style.width
    ctx.stroke()

    if (this.isSelected || this.isHovered) {
      for (const c of coords) {
        drawControlHandle(ctx, c.x!, c.y!, this.style.color, this.isSelected)
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
    
    // Point-in-triangle using barycentric
    const [a, b, c] = coords
    const d1 = sign(x, y, a.x, a.y, b.x, b.y)
    const d2 = sign(x, y, b.x, b.y, c.x, c.y)
    const d3 = sign(x, y, c.x, c.y, a.x, a.y)
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0)
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0)
    return !(hasNeg && hasPos)
  }
}

function sign(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2)
}
