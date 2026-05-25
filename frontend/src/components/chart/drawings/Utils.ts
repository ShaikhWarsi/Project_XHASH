import type { Point } from '../DrawingTypes'

/** Distance between two points. */
export function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/** Closest distance from point p to line segment a-b. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return dist(p, a)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/** Hit-test threshold in pixels. */
export const HIT_THRESHOLD = 6

/** Draw a crosshair indicator at a point (for active tool). */
export function drawControlHandle(ctx: CanvasRenderingContext2D, x: number, y: number, color = '#3b82f6', selected = false) {
  const r = selected ? 5 : 3
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  if (selected) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

/** Draw a selection box around a region. */
export function drawSelectionBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])
}

/** Check if a point is inside a rectangle. */
export function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

/** Linearly interpolate between two points. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Format a number for display on drawing labels. */
export function fmtPrice(price: number): string {
  if (Math.abs(price) >= 1000) return price.toFixed(2)
  if (Math.abs(price) >= 10) return price.toFixed(3)
  if (Math.abs(price) >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

/** Draw a filled label background for text. */
export function drawLabelBg(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = '10px JetBrains Mono, monospace'
  const m = ctx.measureText(text)
  const pad = 4
  const bx = x
  const by = y - 12
  const bw = m.width + pad * 2
  const bh = 16
  ctx.fillStyle = color
  ctx.fillRect(bx, by, bw, bh)
  ctx.fillStyle = '#fff'
  ctx.fillText(text, bx + pad, by + 12)
  return { bx, by, bw, bh }
}
