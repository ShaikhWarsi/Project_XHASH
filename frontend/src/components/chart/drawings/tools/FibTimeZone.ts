import { DrawingTool } from '../DrawingTool'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'

export class FibTimeZone extends DrawingTool {
  static readonly pointCount = 2
  get pointCount() { return FibTimeZone.pointCount }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 2) return
    const x1 = mapper.timeToX(this.points[0].time)
    const x2 = mapper.timeToX(this.points[1].time)
    if (x1 == null || x2 == null) return

    const dist = x2 - x1
    if (dist === 0) return
    const h = mapper.getPaneHeight?.(paneIndex) ?? 300
    const fibs = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
    const colors = ['rgba(59,130,246,0.08)', 'rgba(59,130,246,0.05)', 'rgba(59,130,246,0.03)']

    for (let i = 0; i < fibs.length; i++) {
      const x = x1 + dist * fibs[i]
      if (x > (mapper.getWidth?.() ?? 1000)) break

      ctx.fillStyle = colors[i % colors.length]
      const prevX = x1 + dist * (fibs[i - 1] ?? 0)
      ctx.fillRect(prevX, 0, x - prevX, h)

      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.font = '9px JetBrains Mono, monospace'
      ctx.fillStyle = '#639'
      ctx.fillText('dZ', x + 2, 12)
    }

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, x1, h / 2, this.style.color, this.isSelected)
      drawControlHandle(ctx, x2, h / 2, this.style.color, this.isSelected)
    }
  }

  hitTest(x: number, _y: number, mapper: any, _paneIndex: number): boolean {
    if (this.points.length < 2) return false
    const x1 = mapper.timeToX(this.points[0].time)
    const x2 = mapper.timeToX(this.points[1].time)
    if (x1 == null || x2 == null) return false
    const dist = x2 - x1
    if (dist === 0) return false
    const fibs = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
    for (let i = 0; i < fibs.length; i++) {
      const fx = x1 + dist * fibs[i]
      if (Math.abs(x - fx) < HIT_THRESHOLD) return true
    }
    return false
  }
}
