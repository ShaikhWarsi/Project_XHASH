import { DrawingTool } from '../DrawingTool'
import type { DrawingEvent } from '../../DrawingTypes'

export class Brush extends DrawingTool {
  static readonly pointCount = Infinity
  get pointCount() { return Brush.pointCount }

  private path: { x: number; y: number }[] = []

  onMouseDown(event: DrawingEvent): boolean {
    if (event.time == null || event.price == null) return false
    this.path = [{ x: event.x, y: event.y }]
    this.points.push({ time: event.time, price: event.price })
    return true
  }

  onMouseMove(event: DrawingEvent) {
    if (this.path.length === 0) return
    this.path.push({ x: event.x, y: event.y })
  }

  onMouseUp(_event: DrawingEvent) {
    this.path = []
  }

  render(ctx: CanvasRenderingContext2D, _mapper: any, _paneIndex: number) {
    const pts = this.path
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = this.style.color
    ctx.lineWidth = this.style.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = this.style.opacity
    ctx.moveTo(pts[0].x!, pts[0].y!)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x!, pts[i].y!)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  hitTest(_x: number, _y: number, _mapper: any, _paneIndex: number): boolean {
    return false
  }
}
