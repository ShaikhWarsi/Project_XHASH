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
import { GannBox } from './tools/GannBox'
import { GannSquare } from './tools/GannSquare'
import { AutoFibRetracement } from './tools/AutoFibRetracement'
import { AutoPitchfork } from './tools/AutoPitchfork'
import { SpeedResistanceLines } from './tools/SpeedResistanceLines'
import { LongMarker } from './tools/LongMarker'
import { ShortMarker } from './tools/ShortMarker'
import { AnchoredVWAPTool } from './tools/AnchoredVWAPTool'
import { RulerTool } from './tools/RulerTool'
import { CoordMapper } from '../CoordMapper'

const TOOL_MAP: Record<string, new (id: string, type: ToolType, points?: any[], style?: Partial<DrawingStyle>) => DrawingTool> = {
  trendline: TrendLine, ray: RayLine, extended_line: ExtendedLine,
  horizontal_line: HorizontalLine, vertical_line: VerticalLine,
  fib_retracement: FibRetracement, fib_extension: FibExtension, fib_timezone: FibTimeZone,
  rectangle: Rectangle, ellipse: Ellipse, triangle: Triangle, parallelogram: Parallelogram,
  channel: Channel, text_label: TextLabel, arrow: Arrow, brush: Brush,   gann_fan: GannFan,
  long_marker: LongMarker,
  short_marker: ShortMarker,
  anchored_vwap: AnchoredVWAPTool,
  ruler: RulerTool,
  gann_box: GannBox,
  gann_square: GannSquare,
  auto_fib: AutoFibRetracement,
  auto_pitchfork: AutoPitchfork,
  speed_resistance_lines: SpeedResistanceLines,
}

const MAX_HISTORY = 50
const STORAGE_VERSION = 1

const STORAGE_MIGRATIONS: Record<number, (data: any) => any> = {
  0: (data: any) => {
    if (Array.isArray(data)) {
      return { version: 1, drawings: data }
    }
    return data
  },
}

function migrateStorage(raw: any): { version: number; drawings: any[] } {
  if (!raw || typeof raw !== 'object') return { version: STORAGE_VERSION, drawings: [] }
  let data = raw
  if (Array.isArray(data)) {
    data = { version: 0, drawings: data }
  }
  let version = data.version ?? 0
  let current = { ...data }
  while (version < STORAGE_VERSION) {
    const migrator = STORAGE_MIGRATIONS[version]
    if (!migrator) break
    current = migrator(current)
    version = current.version ?? STORAGE_VERSION
  }
  if (!Array.isArray(current.drawings)) current.drawings = []
  return { version: current.version ?? STORAGE_VERSION, drawings: current.drawings }
}

export class DrawingManager {
  private chart: IChartApi
  private drawings: DrawingTool[] = []
  private mapper: CoordMapper
  private activeDrawing: DrawingTool | null = null
  private activeToolType: ToolType | null = null
  chartData: any[] = []
  levelsManager = new LevelsManager()
  private nextId = 1
  private history: DrawingData[][] = []
  private historyIndex = -1
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private hoveredId: string | null = null
  private selectedId: string | null = null
  private onChanged: (() => void) | null = null
  private onError: ((message: string) => void) | null = null
  private storageKey = ''
  private changeTimeout: ReturnType<typeof setTimeout> | null = null
  private beforeUnloadHandler: (() => void) | null = null

  constructor(_chart: IChartApi, mapper: CoordMapper) {
    this.chart = _chart
    this.mapper = mapper
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
    if ((drawing as any).setChartData && this.chartData.length > 0) {
      (drawing as any).setChartData(this.chartData)
    }
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
    if ((drawing as any).setChartData && this.chartData.length > 0) {
      (drawing as any).setChartData(this.chartData)
    }
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
        if ((this.activeDrawing as any).setChartData && this.chartData.length > 0) {
          (this.activeDrawing as any).setChartData(this.chartData)
        }
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
      const parsed = JSON.parse(raw)
      const migrated = migrateStorage(parsed)
      const data: DrawingData[] = migrated.drawings.filter((d: any) => d && d.type)
      this.drawings = data.map((d) => this.createFromData(d)).filter(Boolean) as DrawingTool[]
      this.saveHistory()
      if (migrated.version !== STORAGE_VERSION || !parsed.version) {
        this.saveToStorage()
      }
    } catch {
      this.onError?.('Failed to load drawings: stored data is corrupt')
    }
  }

  saveToStorage() {
    if (!this.storageKey) return
    try {
      const drawings = this.drawings.map((d) => d.toJSON())
      const payload = { version: STORAGE_VERSION, drawings }
      localStorage.setItem(this.storageKey, JSON.stringify(payload))
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

  saveToLibrary(symbol: string, interval: string): void {
    const drawings = this.getDrawings()
    const key = `drawing_lib_${symbol}_${interval}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    const entry = {
      id: `lib_${Date.now()}`,
      savedAt: new Date().toISOString(),
      symbol,
      interval,
      drawingCount: drawings.length,
      drawings: drawings.map(d => ({ type: d.type, points: d.points, style: d.style })),
    }
    existing.push(entry)
    localStorage.setItem(key, JSON.stringify(existing))
  }

  loadFromLibrary(symbol: string, interval: string, libraryId: string): boolean {
    const key = `drawing_lib_${symbol}_${interval}`
    const entries = JSON.parse(localStorage.getItem(key) || '[]')
    const entry = entries.find((e: any) => e.id === libraryId)
    if (!entry) return false
    for (const d of entry.drawings) {
      this.addDrawingFromJSON(d)
    }
    return true
  }

  listLibraries(symbol: string, interval: string): any[] {
    const key = `drawing_lib_${symbol}_${interval}`
    return JSON.parse(localStorage.getItem(key) || '[]')
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
