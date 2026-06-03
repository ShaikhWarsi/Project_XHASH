import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD, distToSegment } from '../Utils'
import type { PricePoint } from '../../DrawingTypes'

function findSwingSequence(points: PricePoint[]): PricePoint[] {
  if (points.length < 5) return points.slice(0, 3)
  const prices = points.map((p) => p.price)
  const peaks: number[] = []
  for (let i = 1; i < prices.length - 1; i++) {
    if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) peaks.push(i)
    if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) peaks.push(i)
  }
  if (peaks.length < 3) return points.slice(0, 3)
  const lastThree = peaks.slice(-3).map((idx) => points[idx])
  return lastThree.length >= 3 ? lastThree : points.slice(0, 3)
}

export class AutoPitchfork extends DrawingTool {
  static readonly pointCount = 3

  constructor(id: string, points?: PricePoint[], style?: any) {
    super(id, 'channel', points, style)
  }

  get pointCount() { return AutoPitchfork.pointCount }

  autoDetect(data: PricePoint[]) {
    this.points = findSwingSequence(data)
  }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 3) return
    const pts = this.points.map((p) => ({
      x: mapper.timeToX(p.time) as number,
      y: mapper.priceToY(p.price, paneIndex) as number,
    }))
    if (pts.some((p) => p.x == null || p.y == null)) return

    const [a, b, c] = pts as { x: number; y: number }[]
    const midX = (b.x + c.x) / 2
    const midY = (b.y + c.y) / 2
    const dx = midX - a.x
    const dy = midY - a.y

    const extendX = a.x + dx * 3
    const extendY = a.y + dy * 3
    const upperX = extendX
    const upperY = a.y + (midY - a.y) * 3
    const lowerX = extendX
    const lowerY = a.y - (a.y - midY) * 3

    ctx.strokeStyle = this.style.color
    ctx.lineWidth = 0.5
    ctx.setLineDash([3, 3])

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(extendX, extendY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(midX, midY)
    ctx.lineTo(extendX, upperY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(midX, midY)
    ctx.lineTo(extendX, lowerY)
    ctx.stroke()

    ctx.setLineDash([])

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, a.x, a.y, this.style.color, this.isSelected)
      drawControlHandle(ctx, b.x, b.y, this.style.color, this.isSelected)
      drawControlHandle(ctx, c.x, c.y, this.style.color, this.isSelected)
    }
  }

  hitTest(x: number, y: number, mapper: any, paneIndex: number): boolean {
    if (this.points.length < 3) return false
    const pts = this.points.map((p) => ({
      x: mapper.timeToX(p.time) as number,
      y: mapper.priceToY(p.price, paneIndex) as number,
    }))
    if (pts.some((p) => p.x == null || p.y == null)) return false

    const [a, b, c] = pts as { x: number; y: number }[]
    const midX = (b.x + c.x) / 2
    const midY = (b.y + c.y) / 2
    const extendX = a.x + (midX - a.x) * 3
    const extendY = a.y + (midY - a.y) * 3

    return (
      distToSegment({ x, y }, a, { x: extendX, y: extendY }) < HIT_THRESHOLD ||
      distToSegment({ x, y }, { x: midX, y: midY }, { x: extendX, y: extendY }) < HIT_THRESHOLD
    )
  }
}
