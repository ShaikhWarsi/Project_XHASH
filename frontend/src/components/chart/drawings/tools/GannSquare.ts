import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD, pointInRect } from '../Utils'
import type { PricePoint } from '../../DrawingTypes'

export class GannSquare extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return GannSquare.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    const left = Math.min(x1, x2)
    const top = Math.min(y1, y2)
    const w = Math.abs(x2 - x1)
    const h = Math.abs(y2 - y1)
    const size = Math.min(w, h)
    const right = left + size
    const bottom = top + size

    ctx.strokeStyle = this.style.color
    ctx.lineWidth = 1
    ctx.strokeRect(left, top, size, size)

    ctx.strokeStyle = this.style.color
    ctx.lineWidth = 0.5
    ctx.setLineDash([4, 4])

    ctx.beginPath()
    ctx.moveTo(left, top)
    ctx.lineTo(right, bottom)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(left, bottom)
    ctx.lineTo(right, top)
    ctx.stroke()

    ctx.setLineDash([])

    if (size > 0) {
      const angles = [0.25, 0.5, 0.75]
      for (const a of angles) {
        const x = left + size * a
        const y = top + size * a
        ctx.strokeStyle = this.style.color
        ctx.globalAlpha = 0.3
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      const diagonals = [0.125, 0.375, 0.625, 0.875]
      for (const a of diagonals) {
        ctx.strokeStyle = this.style.color
        ctx.globalAlpha = 0.15
        ctx.lineWidth = 0.5
        const x = left + size * a
        const y = top + size * a
        ctx.beginPath()
        ctx.moveTo(left, bottom - (bottom - top) * a)
        ctx.lineTo(right, bottom - (bottom - top) * a)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(left + size * a, top)
        ctx.lineTo(left + size * a, bottom)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
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
    const left = Math.min(x1, x2)
    const top = Math.min(y1, y2)
    const size = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1))
    return pointInRect(x, y, left, top, size, size)
  }
}
