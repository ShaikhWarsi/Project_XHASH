import { DrawingTool } from '../DrawingTool'
import { drawControlHandle } from '../Utils'
import { FIB_EXT_LEVELS, FIB_COLORS } from '../../DrawingTypes'

export class FibExtension extends DrawingTool {
  static readonly pointCount = 3
  get pointCount() { return FibExtension.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 3) return

    const coords = this.points.map((p) => ({
      x: mapper.timeToX(p.time),
      y: mapper.priceToY(p.price, paneIndex),
    }))
    if (coords.some((c) => c.x == null || c.y == null)) return

    const [p0, p1, p2] = coords as { x: number; y: number }[]
    const retrace = this.points[1].price - this.points[0].price
    const midX = (p0.x + p1.x + p2.x) / 3

    for (let i = 0; i < FIB_EXT_LEVELS.length; i++) {
      const extLevel = this.points[2].price + retrace * FIB_EXT_LEVELS[i]
      const extY = mapper.priceToY(extLevel, paneIndex)
      if (extY == null) continue

      ctx.strokeStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(p0.x, extY)
      ctx.lineTo(p2.x, extY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.fillText((FIB_EXT_LEVELS[i] * 100).toFixed(1) + '%', midX - 40, extY - 4)
    }

    if (this.isSelected || this.isHovered) {
      for (const c of coords) {
        drawControlHandle(ctx, c.x!, c.y!, this.style.color, this.isSelected)
      }
    }
  }

  hitTest(_x: number, y: number, mapper: any, paneIndex: number): boolean {
    if (this.points.length < 3) return false
    const ys = this.points.map((p) => mapper.priceToY(p.price, paneIndex))
    if (ys.some((y) => y == null)) return false
    const yVals = ys as number[]
    return y >= Math.min(...yVals) && y <= Math.max(...yVals)
  }
}
