import type { IChartApi } from 'lightweight-charts'
import { DrawingTool } from './DrawingTool'
import type { DrawingData, DrawingEvent, DrawingStyle, ToolType } from '../DrawingTypes'
import { LevelsManager } from './LevelsManager'
import type { SupportResistanceLevel } from './LevelsManager'
import { TrendLine } from './tools/TrendLine'
import { RayLine } from './tools/RayLine'
import { ExtendedLine } from './tools/ExtendedLine'
import { HorizontalLine } from './tools/HorizontalLine'
import { VerticalLine } from './tools/VerticalLine'
import { FibRetracement } from './tools/FibRetracement'
import { FibExtension } from './tools/FibExtension'
import { FibTimeZone } from './tools/FibTimeZone'
import { Rectangle } from './tools/Rectangle'
import { Ellipse } from './tools/Ellipse'
import { Triangle } from './tools/Triangle'
import { Parallelogram } from './tools/Parallelogram'
import { Channel } from './tools/Channel'
import { TextLabel } from './tools/TextLabel'
import { Arrow } from './tools/Arrow'
import { Brush } from './tools/Brush'
import { GannFan } from './tools/GannFan'
import { LongMarker } from './tools/LongMarker'
import { ShortMarker } from './tools/ShortMarker'
import { CoordMapper } from '../CoordMapper'

const TOOL_MAP: Record<string, new (id: string, type: ToolType, points?: any[], style?: Partial<DrawingStyle>) => DrawingTool> = {
  trendline: TrendLine, ray: RayLine, extended_line: ExtendedLine,
  horizontal_line: HorizontalLine, vertical_line: VerticalLine,
  fib_retracement: FibRetracement, fib_extension: FibExtension, fib_timezone: FibTimeZone,
  rectangle: Rectangle, ellipse: Ellipse, triangle: Triangle, parallelogram: Parallelogram,
  channel: Channel, text_label: TextLabel, arrow: Arrow, brush: Brush,   gann_fan: GannFan,
  long_marker: LongMarker,
  short_marker: ShortMarker,
}

const MAX_HISTORY = 50

export class DrawingManager {
  readonly levelsManager: LevelsManager
  private drawings: DrawingTool[] = []
  private selectedId: string | null = null
  private activeToolType: ToolType | null = null
  private activeDrawing: DrawingTool | null = null
  private nextId = 1
  private history: DrawingData[][] = []
  private historyIndex = -1
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private hoveredId: string | null = null
  private mapper: CoordMapper
  private onChanged: (() => void) | null = null
  private onError: ((message: string) => void) | null = null
  private storageKey = ''
  private changeTimeout: ReturnType<typeof setTimeout> | null = null
  private beforeUnloadHandler: (() => void) | null = null

  constructor(_chart: IChartApi, mapper: CoordMapper) {
    this.mapper = mapper
    this.levelsManager = new LevelsManager()
    this.levelsManager.setOnChanged(() => this.scheduleChange())
    this.beforeUnloadHandler = () => this.saveToStorage()
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.beforeUnloadHandler)
    }
  }

  setOnChanged(cb: (() => void) | null) { this.onChanged = cb }
  setOnError(cb: ((message: string) => void) | null) { this.onError = cb }

  private saveHistory() {
    const snapshot = this.drawings.map((d) => d.toJSON())
    this.historyIndex++
    this.history = this.history.slice(0, this.historyIndex)
    this.history.push(snapshot)
    if (this.history.length > MAX_HISTORY) {
      this.history.shift()
      this.historyIndex--
    }
  }

  setStorageKey(key: string) { this.storageKey = key }

  private scheduleChange() {
    if (this.changeTimeout) clearTimeout(this.changeTimeout)
    this.changeTimeout = setTimeout(() => {
      this.saveToStorage()
      this.onChanged?.()
    }, 300)
  }

  selectTool(type: ToolType | null) {
    this.activeToolType = type
    this.activeDrawing = null
  }

  getActiveTool(): ToolType | null { return this.activeToolType }

  getDrawings(): DrawingTool[] { return this.drawings }

  getSelectedDrawing(): DrawingTool | null {
    if (!this.selectedId) return null
    return this.drawings.find((d) => d.id === this.selectedId) ?? null
  }

  getHoveredDrawing(): DrawingTool | null {
    if (!this.hoveredId) return null
    return this.drawings.find((d) => d.id === this.hoveredId) ?? null
  }

  setSelected(id: string | null) {
    this.selectedId = id
    this.drawings.forEach((d) => d.setSelected(d.id === id))
  }

  undo() {
    if (this.historyIndex <= 0) return
    this.historyIndex--
    this.restoreSnapshot(this.history[this.historyIndex])
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return
    this.historyIndex++
    this.restoreSnapshot(this.history[this.historyIndex])
  }

  canUndo(): boolean { return this.historyIndex > 0 }
  canRedo(): boolean { return this.historyIndex < this.history.length - 1 }

  private restoreSnapshot(data: DrawingData[]) {
    this.drawings = data.map((d) => this.createFromData(d)).filter(Boolean) as DrawingTool[]
  }

  deleteSelected() {
    if (!this.selectedId) return
    this.saveHistory()
    this.drawings = this.drawings.filter((d) => d.id !== this.selectedId)
    this.selectedId = null
    this.scheduleChange()
  }

  addDrawing(type: ToolType, points: any[], style?: Partial<DrawingStyle>): DrawingTool | null {
    this.saveHistory()
    const Ctor = TOOL_MAP[type]
    if (!Ctor) return null
    const id = `drawing_${this.nextId++}`
    const drawing = new Ctor(id, type, points, style)
    this.drawings.push(drawing)
    this.selectedId = id
    drawing.setSelected(true)
    this.scheduleChange()
    return drawing
  }

  createFromData(data: DrawingData): DrawingTool | null {
    const Ctor = TOOL_MAP[data.type]
    if (!Ctor) return null
    const drawing = new Ctor(data.id, data.type as ToolType, data.points, data.style)
    drawing.visible = data.visible
    drawing.createdAt = data.createdAt
    return drawing
  }

  handleMouseDown(event: DrawingEvent) {
    if (this.activeToolType && this.activeToolType !== 'cursor' && this.activeToolType !== 'crosshair') {
      if (!this.activeDrawing || this.activeDrawing.isComplete()) {
        this.saveHistory()
        const Ctor = TOOL_MAP[this.activeToolType]
        if (!Ctor) return
        const id = `drawing_${this.nextId++}`
        this.activeDrawing = new Ctor(id, this.activeToolType)
        this.drawings.push(this.activeDrawing)
        this.selectedId = id
      }
      this.activeDrawing?.addPoint(event)
      this.scheduleChange()
      return
    }

    // Check for hit test on existing drawings (from top most to bottom)
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i]
      if (d.hitTest(event.x, event.y, this.mapper, event.paneIndex)) {
        this.setSelected(d.id)
        this.isDragging = true
        this.dragStartX = event.x
        this.dragStartY = event.y
        return
      }
    }
    this.setSelected(null)
  }

  handleMouseMove(event: DrawingEvent) {
    // Freehand drawing
    if (this.activeDrawing && !this.activeDrawing.isComplete() && this.activeDrawing.type === 'brush') {
      this.activeDrawing.onMouseMove(event)
      this.scheduleChange()
      return
    }

    // Dragging
    if (this.isDragging && this.selectedId) {
      const selected = this.getSelectedDrawing()
      if (selected) {
        const dx = event.x - this.dragStartX
        const dy = event.y - this.dragStartY
        selected.move(dx, dy, this.mapper, event.paneIndex)
        this.dragStartX = event.x
        this.dragStartY = event.y
        this.scheduleChange()
      }
      return
    }

    // Hover
    this.hoveredId = null
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i]
      if (d.hitTest(event.x, event.y, this.mapper, event.paneIndex)) {
        d.setHovered(true)
        this.hoveredId = d.id
      } else {
        d.setHovered(false)
      }
    }
  }

  handleMouseUp(event: DrawingEvent) {
    if (this.activeDrawing && this.activeDrawing.type === 'brush') {
      this.activeDrawing.onMouseUp(event)
    }
    if (this.isDragging) {
      this.saveHistory()
      this.isDragging = false
      this.scheduleChange()
    }
    // Complete active drawing if it's done
    if (this.activeDrawing && (this.activeDrawing.isComplete() || event.altKey)) {
      this.activeDrawing = null
    }
  }

  handleDblClick(event: DrawingEvent) {
    const selected = this.getSelectedDrawing()
    if (selected) selected.onDblClick(event)
  }

  render(ctx: CanvasRenderingContext2D, paneIndex: number) {
    for (const d of this.drawings) {
      if (!d.visible) continue
      d.render(ctx, this.mapper, paneIndex)
    }
  }

  loadFromStorage(key: string) {
    this.storageKey = key
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const data: DrawingData[] = JSON.parse(raw)
      this.drawings = data.map((d) => this.createFromData(d)).filter(Boolean) as DrawingTool[]
      this.saveHistory()
    } catch {
      this.onError?.('Failed to load drawings: stored data is corrupt')
    }
  }

  saveToStorage() {
    if (!this.storageKey) return
    try {
      const data = this.drawings.map((d) => d.toJSON())
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch {
      this.onError?.('Failed to save drawings: localStorage may be full')
    }
  }

  convertSelectedToLevel(): SupportResistanceLevel | null {
    const selected = this.getSelectedDrawing()
    if (!selected) return null
    const data = selected.toJSON()
    if (data.points.length === 0) return null
    const price = data.points[0].price ?? (data.points.length > 1 ? data.points[1].price : null)
    if (price == null) return null
    const type = (selected.type === 'trendline' || selected.type === 'horizontal_line') ? 'resistance' as const : 'support' as const
    const label = `${selected.type} @ ${(price as number).toFixed(2)}`
    return this.levelsManager.addLevel(price as number, type, selected.id, label)
  }

  detectLevels(): SupportResistanceLevel[] {
    this.levelsManager.detectLevelsFromDrawings(this.drawings, this.mapper)
    return this.levelsManager.getLevels()
  }

  destroy() {
    this.saveToStorage()
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler)
      this.beforeUnloadHandler = null
    }
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout)
      this.changeTimeout = null
    }
  }

  addDrawingFromJSON(data: DrawingData): DrawingTool | null {
    const d = this.createFromData(data)
    if (d) {
      this.saveHistory()
      this.drawings.push(d)
      this.scheduleChange()
    }
    return d
  }
}
