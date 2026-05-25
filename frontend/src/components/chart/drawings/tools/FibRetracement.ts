import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'
import { FIB_LEVELS, FIB_COLORS } from '../../DrawingTypes'

export class FibRetracement extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return FibRetracement.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    const loP = y1 > y2 ? this.points[0].price : this.points[1].price
    const hiP = y1 < y2 ? this.points[0].price : this.points[1].price
    const range = hiP - loP
    const midX = (x1 + x2) / 2

    const levels = FIB_LEVELS
    for (let i = 0; i < levels.length; i++) {
      const level = loP + range * (1 - levels[i])
      const ly = mapper.priceToY(level, paneIndex)
      if (ly == null) continue
      const yLevel = y1 + (y2 - y1) * levels[i]

      ctx.strokeStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(x1, yLevel)
      ctx.lineTo(x2, yLevel)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.fillText((levels[i] * 100).toFixed(1) + '%', midX - 40, yLevel - 4)
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
    const midX = (x1 + x2) / 2
    return Math.abs(x - midX) < HIT_THRESHOLD * 4 && (
      (y >= Math.min(y1, y2) && y <= Math.max(y1, y2))
    )
  }

  getBounds() {
    if (this.points.length < 2) return null
    return { left: 0, top: 0, right: 0, bottom: 0 }
  }
}
