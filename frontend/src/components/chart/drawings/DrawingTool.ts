import type { PricePoint, DrawingData, DrawingEvent, DrawingStyle, ToolType } from '../DrawingTypes'

export abstract class DrawingTool {
  readonly id: string
  readonly type: ToolType
  points: PricePoint[]
  style: DrawingStyle
  visible: boolean
  createdAt: number
  protected pendingPointIndex = -1
  protected isHovered = false
  protected isSelected = false

  constructor(id: string, type: ToolType, points: PricePoint[] = [], style?: Partial<DrawingStyle>) {
    this.id = id
    this.type = type
    this.points = points
    this.style = {
      color: style?.color || '#3b82f6',
      width: style?.width ?? 2,
      opacity: style?.opacity ?? 1,
      fillColor: style?.fillColor || '#3b82f6',
      fillOpacity: style?.fillOpacity ?? 0.15,
      textColor: style?.textColor || '#e8eaed',
      fontSize: style?.fontSize ?? 11,
    }
    this.visible = true
    this.createdAt = Date.now()
  }

  abstract get pointCount(): number

  abstract render(ctx: CanvasRenderingContext2D, mapper: { timeToX: (t: any) => number | null; priceToY: (p: number, pi?: number) => number | null; xToTime?: (x: number) => any; yToPrice?: (y: number, pi?: number) => number | null }, paneIndex: number): void

  abstract hitTest(x: number, y: number, mapper: { timeToX: (t: any) => number | null; priceToY: (p: number, pi?: number) => number | null; xToTime?: (x: number) => any; yToPrice?: (y: number, pi?: number) => number | null }, paneIndex: number): boolean

  onMouseDown(_event: DrawingEvent): boolean { return false }
  onMouseMove(_event: DrawingEvent): void {}
  onMouseUp(_event: DrawingEvent): void {}
  onDblClick(_event: DrawingEvent): void {}

  canAddPoint(): boolean {
    return this.points.length < this.pointCount
  }

  addPoint(event: DrawingEvent): boolean {
    if (!this.canAddPoint() || event.time == null || event.price == null) return false
    this.points.push({ time: event.time, price: event.price })
    return true
  }

  isComplete(): boolean {
    return this.points.length >= this.pointCount
  }

  move(dx: number, dy: number, mapper: { timeToX: (t: any) => number | null; priceToY: (p: number, pi?: number) => number | null; xToTime?: (x: number) => any; yToPrice?: (y: number, pi?: number) => number | null }, paneIndex: number) {
    for (const pt of this.points) {
      const x = mapper.timeToX(pt.time)
      const y = mapper.priceToY(pt.price, paneIndex)
      if (x == null || y == null) continue
      const newX = x + dx
      const newY = y + dy
      const newTime = mapper.xToTime?.(newX)
      const newPrice = mapper.yToPrice?.(newY, paneIndex)
      if (newTime != null) pt.time = newTime
      if (newPrice != null) pt.price = newPrice
    }
  }

  setHovered(h: boolean) { this.isHovered = h }
  setSelected(s: boolean) { this.isSelected = s }

  toJSON(): DrawingData {
    return {
      id: this.id, type: this.type, points: this.points.map((p) => ({ ...p })),
      style: { ...this.style }, visible: this.visible, createdAt: this.createdAt,
    }
  }

  fromJSON(data: DrawingData) {
    this.points = data.points.map((p) => ({ ...p }))
    this.style = { ...this.style, ...data.style }
    this.visible = data.visible
    this.createdAt = data.createdAt
  }

  getBounds(): { left: number; top: number; right: number; bottom: number } | null {
    return null
  }
}

export interface DrawingToolConstructor {
  new (id: string, points?: PricePoint[], style?: Partial<DrawingStyle>): DrawingTool
  readonly pointCount: number
}
