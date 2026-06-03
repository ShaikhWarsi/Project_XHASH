import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'
import { FIB_LEVELS, FIB_COLORS } from '../../DrawingTypes'
import type { PricePoint } from '../../DrawingTypes'

function findSwingHighLow(points: PricePoint[]): { high: PricePoint; low: PricePoint } | null {
  if (points.length < 3) return null
  const prices = points.map((p) => p.price)
  const maxIdx = prices.indexOf(Math.max(...prices))
  const minIdx = prices.indexOf(Math.min(...prices))
  return {
    high: points[maxIdx],
    low: points[minIdx],
  }
}

export class AutoFibRetracement extends DrawingTool {
  static readonly pointCount = 0

  constructor(id: string, points?: PricePoint[], style?: any) {
    super(id, 'fib_retracement', points, style)
  }

  get pointCount() { return AutoFibRetracement.pointCount }

  autoDetect(data: PricePoint[]) {
    const swing = findSwingHighLow(data)
    if (swing) {
      this.points = [swing.high, swing.low]
    }
  }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const y1 = mapper.priceToY(this.points[0].price, paneIndex)
    const x2 = mapper.timeToX(this.points[1].time)
    const y2 = mapper.priceToY(this.points[1].price, paneIndex)
    if (x1 == null || y1 == null || x2 == null || y2 == null) return

    const hiP = this.points[0].price > this.points[1].price ? this.points[0].price : this.points[1].price
    const loP = this.points[0].price < this.points[1].price ? this.points[0].price : this.points[1].price
    const range = hiP - loP
    const leftX = Math.min(x1, x2)
    const rightX = Math.max(x1, x2)

    for (let i = 0; i < FIB_LEVELS.length; i++) {
      const levelPrice = hiP - range * FIB_LEVELS[i]
      const ly = mapper.priceToY(levelPrice, paneIndex)
      if (ly == null) continue

      ctx.strokeStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(leftX, ly)
      ctx.lineTo(rightX, ly)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillStyle = FIB_COLORS[i % FIB_COLORS.length]
      ctx.fillText((FIB_LEVELS[i] * 100).toFixed(1) + '%', rightX + 4, ly - 3)
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
    return Math.abs(x - midX) < HIT_THRESHOLD * 4 && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)
  }
}
