import { DrawingTool } from '../DrawingTool'
import type { DrawingEvent } from '../../DrawingTypes'
import { drawControlHandle } from '../Utils'

export class TextLabel extends DrawingTool {
  static readonly pointCount = 1
  get pointCount() { return TextLabel.pointCount }

  private text: string = 'Text'
  private offsetX = 0
  private offsetY = 0

  setText(text: string) { this.text = text }

  onDblClick(_event: DrawingEvent) {
    // In a real app, this would open a text editor
    this.text = prompt('Enter label text:', this.text) || this.text
  }

  render(ctx: CanvasRenderingContext2D, mapper: any, paneIndex: number) {
    if (this.points.length < 1) return
    const x = mapper.timeToX(this.points[0].time)
    const y = mapper.priceToY(this.points[0].price, paneIndex)
    if (x == null || y == null) return

    ctx.font = `${(this.style.fontSize ?? 11)}px Inter, sans-serif`
    const m = ctx.measureText(this.text)
    const pad = 4
    const bx = x + this.offsetX
    const by = y + this.offsetY - (this.style.fontSize ?? 11)

    ctx.fillStyle = this.style.fillColor || 'rgba(0,0,0,0.7)'
    ctx.fillRect(bx, by, m.width + pad * 2, (this.style.fontSize ?? 11) + pad * 2)

    ctx.fillStyle = this.style.textColor || '#e8eaed'
    ctx.fillText(this.text, bx + pad, by + (this.style.fontSize ?? 11) + pad)

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, x, y, this.style.color, this.isSelected)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 0.5
      ctx.strokeRect(bx, by, m.width + pad * 2, (this.style.fontSize ?? 11) + pad * 2)
    }
  }

  hitTest(x: number, y: number, mapper: any, paneIndex: number): boolean {
    if (this.points.length < 1) return false
    const px = mapper.timeToX(this.points[0].time)
    const py = mapper.priceToY(this.points[0].price, paneIndex)
    if (px == null || py == null) return false
    return Math.abs(x - px - this.offsetX) < 30 && Math.abs(y - py - this.offsetY) < 15
  }
}
