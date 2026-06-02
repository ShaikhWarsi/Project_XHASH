import { createChart, CandlestickSeries, HistogramSeries, LineSeries, type IChartApi, type ISeriesApi, type Time, type CandlestickData, type HistogramData, type LineData, type SeriesType, type MouseEventParams } from 'lightweight-charts'
import { CoordMapper } from './CoordMapper'
import { DrawingManager } from './drawings/DrawingManager'
import type { ToolType, IndicatorConfig } from './DrawingTypes'
import type { ChartThemeColors } from './ChartTheme'
import { DARK_THEME, getLightweightChartTheme } from './ChartTheme'

export interface ChartOptions {
  symbol: string
  interval: string
  data: CandlestickData[]
  container: HTMLDivElement
  width: number
  height: number
  theme?: ChartThemeColors
}

export interface ChartCallbacks {
  onCrosshairMove?: (params: { time: Time | null; price: number | null }) => void
  onSymbolChange?: (symbol: string) => void
  onIntervalChange?: (interval: string) => void
}

export interface SignalMarker {
  time: Time
  type: 'buy' | 'sell'
  price: number
  label?: string
  strength?: number
}

export interface RegimeZone {
  timeStart: Time
  timeEnd: Time
  regime: string
  color: string
}

export interface StructureOverlay {
  orderBlocks: { level: number; direction: string; confidence: number }[]
  fvgs: { top: number; bottom: number; direction: string }[]
  liquidityLevels: { level: number; direction: string; confidence: number }[]
  keyLevels: number[]
}

export class ChartEngine {
  readonly chart: IChartApi
  readonly mapper: CoordMapper
  readonly drawingManager: DrawingManager
  protected container: HTMLDivElement
  protected overlayCanvas: HTMLCanvasElement
  protected overlayCtx: CanvasRenderingContext2D
  protected overlayDiv: HTMLDivElement | null = null
  protected boundHandlers: { type: string; handler: EventListener }[] = []
  protected clickHandler: ((param: MouseEventParams<Time>) => void) | null = null
  protected crosshairHandlers: ((param: MouseEventParams<Time>) => void)[] = []
  protected resizeObserver: ResizeObserver | null = null
  protected resizeRAF = 0
  protected animationFrameId = 0
  protected callbacks: ChartCallbacks = {}
  protected mainSeries: ISeriesApi<'Candlestick'> | null = null
  protected volumeSeries: ISeriesApi<'Histogram'> | null = null
  protected indicatorSeries: Map<string, ISeriesApi<SeriesType>> = new Map()
  protected _symbol: string
  protected _interval: string
  protected _theme: ChartThemeColors
  protected _signals: SignalMarker[] = []
  protected _regimeZones: RegimeZone[] = []
  protected _structureData: StructureOverlay | null = null

  constructor(options: ChartOptions, callbacks?: ChartCallbacks) {
    this._symbol = options.symbol
    this._interval = options.interval
    this.container = options.container
    this.callbacks = callbacks ?? {}
    this._theme = options.theme ?? DARK_THEME

    const lcTheme = getLightweightChartTheme(this._theme)
    this.chart = createChart(options.container, {
      width: options.width,
      height: options.height,
      ...lcTheme,
      rightPriceScale: {
        borderColor: this._theme.border,
        scaleMargins: { top: 0.1, bottom: 0.3 },
        ...(lcTheme.rightPriceScale || {}),
      },
    })

    this.mapper = new CoordMapper(this.chart)
    this.drawingManager = new DrawingManager(this.chart, this.mapper)

    this.overlayCanvas = document.createElement('canvas')
    this.overlayCanvas.style.position = 'absolute'
    this.overlayCanvas.style.top = '0'
    this.overlayCanvas.style.left = '0'
    this.overlayCanvas.style.pointerEvents = 'none'
    this.overlayCanvas.style.zIndex = '10'
    this.overlayCanvas.width = options.width
    this.overlayCanvas.height = options.height
    this.container.style.position = 'relative'
    this.container.appendChild(this.overlayCanvas)
    this.overlayCtx = this.overlayCanvas.getContext('2d')!

    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.resizeRAF) cancelAnimationFrame(this.resizeRAF)
      this.resizeRAF = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          if (width === 0 || height === 0) continue
          this.chart.resize(width, height)
          this.overlayCanvas.width = width
          this.overlayCanvas.height = height
          this.requestRender()
        }
      })
    })
    this.resizeObserver.observe(options.container)

    this.setupCanvasEvents()
    this.setMainSeries(options.data)

    const crosshairCb = (param: MouseEventParams<Time>) => {
      this.requestRender()
      this.callbacks.onCrosshairMove?.({
        time: param.time ?? null,
        price: param.seriesData?.get?.(this.mainSeries!) as any ?? null,
      })
    }
    this.crosshairHandlers.push(crosshairCb)
    this.chart.subscribeCrosshairMove(crosshairCb)

    const storageKey = `${this._symbol}_${this._interval}`
    this.drawingManager.loadFromStorage(storageKey)
    this.drawingManager.setOnChanged(() => this.requestRender())
  }

  applyTheme(theme: ChartThemeColors): void {
    this._theme = theme
    const lcTheme = getLightweightChartTheme(theme)
    this.chart.applyOptions(lcTheme)
    this.chart.applyOptions({
      rightPriceScale: {
        borderColor: theme.border,
        ...(lcTheme.rightPriceScale || {}),
      },
    })
    if (this.mainSeries) {
      this.mainSeries.applyOptions({
        upColor: theme.up,
        downColor: theme.down,
        wickUpColor: theme.up,
        wickDownColor: theme.down,
      })
    }
    this.requestRender()
  }

  protected setupCanvasEvents() {
    const overlay = document.createElement('div')
    overlay.style.position = 'absolute'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.zIndex = '5'
    overlay.style.cursor = 'crosshair'
    overlay.style.pointerEvents = 'none'
    this.container.appendChild(overlay)
    this.overlayDiv = overlay

    const addBoundListener = (type: string, handler: EventListener) => {
      overlay.addEventListener(type, handler)
      this.boundHandlers.push({ type, handler })
    }

    addBoundListener('mousedown', (e: Event) => {
      const me = e as MouseEvent
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(me.clientX - rect.left, me.clientY - rect.top, me)
      this.drawingManager.handleMouseDown(event)
      this.requestRender()
    })

    addBoundListener('mousemove', (e: Event) => {
      const me = e as MouseEvent
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(me.clientX - rect.left, me.clientY - rect.top, me)
      this.drawingManager.handleMouseMove(event)
      this.requestRender()
    })

    addBoundListener('mouseup', (e: Event) => {
      const me = e as MouseEvent
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(me.clientX - rect.left, me.clientY - rect.top, me)
      this.drawingManager.handleMouseUp(event)
      this.requestRender()
    })

    addBoundListener('dblclick', (e: Event) => {
      const me = e as MouseEvent
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(me.clientX - rect.left, me.clientY - rect.top, me)
      this.drawingManager.handleDblClick(event)
      this.requestRender()
    })

    this.clickHandler = (param: MouseEventParams<Time>) => {
      const tool = this.drawingManager.getActiveTool()
      if (tool && tool !== 'cursor' && tool !== 'crosshair') return
      const point = param.point
      if (!point) return
      const event = {
        x: point.x,
        y: point.y,
        time: param.time ?? null,
        price: null,
        paneIndex: 0,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }
      this.drawingManager.handleMouseDown(event)
      this.requestRender()
    }
    this.chart.subscribeClick(this.clickHandler)

    const cursorCrosshairCb = (param: MouseEventParams<Time>) => {
      const tool = this.drawingManager.getActiveTool()
      if (tool && tool !== 'cursor' && tool !== 'crosshair') return
      const point = param.point
      if (!point) return
      const event = {
        x: point.x,
        y: point.y,
        time: param.time ?? null,
        price: null,
        paneIndex: 0,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }
      this.drawingManager.handleMouseMove(event)
      this.requestRender()
    }
    this.crosshairHandlers.push(cursorCrosshairCb)
    this.chart.subscribeCrosshairMove(cursorCrosshairCb)
  }

  private makeDrawingEvent(x: number, y: number, e: MouseEvent) {
    const time = this.mapper.xToTime(x)
    const price = this.mapper.yToPrice(y, 0)
    return {
      x, y, time, price,
      paneIndex: 0,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    }
  }

  setSymbol(symbol: string) {
    this._symbol = symbol
    const storageKey = `${symbol}_${this._interval}`
    this.drawingManager.loadFromStorage(storageKey)
    this.drawingManager.setStorageKey(storageKey)
    this.callbacks.onSymbolChange?.(symbol)
  }

  setChartInterval(interval: string) {
    this._interval = interval
    const storageKey = `${this._symbol}_${interval}`
    this.drawingManager.loadFromStorage(storageKey)
    this.drawingManager.setStorageKey(storageKey)
    this.callbacks.onIntervalChange?.(interval)
  }

  setMainSeries(data: CandlestickData[]) {
    if (this.mainSeries) {
      this.mainSeries.setData(data)
      this.updateVolumeData(data)
      return
    }
    this.mainSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: this._theme.up,
      downColor: this._theme.down,
      borderVisible: false,
      wickUpColor: this._theme.up,
      wickDownColor: this._theme.down,
    })
    this.mainSeries.setData(data)
    this.mapper.registerPane('main', this.mainSeries)

    const volumeData: HistogramData[] = data.map((d) => ({
      time: d.time,
      value: d.close > d.open ? ((d as any).volume ?? 0) : -((d as any).volume ?? 0),
      color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    }))
    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    this.chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })
    this.volumeSeries.setData(volumeData)
    this.mapper.registerPane('volume', this.volumeSeries)

    this.chart.timeScale().fitContent()
  }

  private updateVolumeData(data: CandlestickData[]) {
    if (!this.volumeSeries) return
    const volumeData: HistogramData[] = data.map((d) => ({
      time: d.time,
      value: d.close > d.open ? ((d as any).volume ?? 0) : -((d as any).volume ?? 0),
      color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    }))
    this.volumeSeries.setData(volumeData)
  }

  updateData(data: CandlestickData[]) {
    this.mainSeries?.setData(data)
    this.updateVolumeData(data)
  }

  updateLastBar(bar: CandlestickData) {
    this.mainSeries?.update(bar)
    if ((bar as any).volume != null) {
      this.volumeSeries?.update({
        time: bar.time,
        value: bar.close > bar.open ? (bar as any).volume : -(bar as any).volume,
        color: bar.close > bar.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
      })
    }
  }

  selectTool(type: ToolType) {
    this.drawingManager.selectTool(type)
    if (this.overlayDiv) {
      const isDrawingTool = type && type !== 'cursor' && type !== 'crosshair'
      this.overlayDiv.style.pointerEvents = isDrawingTool ? 'auto' : 'none'
    }
  }

  requestRender() {
    if (this.animationFrameId) return
    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = 0
      this.renderOverlay()
    })
  }

  seekToIndex(index: number, data: CandlestickData[]) {
    if (index < 0 || index >= data.length) return
    const from = data[0].time
    const to = data[index].time
    this.chart.timeScale().setVisibleRange({ from, to } as any)

    if (this.mainSeries) {
      const subset = data.slice(0, index + 1)
      this.mainSeries.setData(subset)
      this.updateVolumeData(subset)
    }
  }

  fitContent() {
    this.chart.timeScale().fitContent()
  }

  addIndicator(config: IndicatorConfig) {
    if (this.indicatorSeries.has(config.id)) return
    const color = config.style?.color ?? this._theme.accent
    if (config.type === 'line') {
      const series = this.chart.addSeries(LineSeries, {
        color, lineWidth: 1, priceScaleId: config.paneId || undefined,
      })
      if (config.data) series.setData(config.data as LineData[])
      this.indicatorSeries.set(config.id, series)
    } else if (config.type === 'histogram') {
      const series = this.chart.addSeries(HistogramSeries, {
        color, priceScaleId: config.paneId || undefined,
      })
      if (config.data) series.setData(config.data as any)
      this.indicatorSeries.set(config.id, series)
    }
  }

  removeIndicator(id: string) {
    const series = this.indicatorSeries.get(id)
    if (series) {
      this.chart.removeSeries(series)
      this.indicatorSeries.delete(id)
    }
  }

  get symbol() { return this._symbol }
  get interval() { return this._interval }
  get theme() { return this._theme }
  get mainSeriesData() { return this.mainSeries }

  setSignals(signals: SignalMarker[]) {
    this._signals = signals
    this.requestRender()
  }

  setRegime(zones: RegimeZone[]) {
    this._regimeZones = zones
    this.requestRender()
  }

  setStructureData(data: StructureOverlay | null) {
    this._structureData = data
    this.requestRender()
  }

  protected drawSignalMarkers(ctx: CanvasRenderingContext2D) {
    if (!this.mainSeries) return
    for (const sig of this._signals) {
      const x = this.mapper.timeToX(sig.time)
      const y = this.mapper.priceToY(sig.price, 0)
      if (x == null || y == null) continue
      const size = 8 + (sig.strength ?? 1) * 3
      const half = size / 2
      if (sig.type === 'buy') {
        ctx.fillStyle = this._theme.up
        ctx.beginPath()
        ctx.moveTo(x - half, y - half)
        ctx.lineTo(x + half, y)
        ctx.lineTo(x - half, y + half)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = `${this._theme.up}40`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = this._theme.down
        ctx.beginPath()
        ctx.moveTo(x - half, y + half)
        ctx.lineTo(x + half, y)
        ctx.lineTo(x - half, y - half)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = `${this._theme.down}40`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  protected drawRegimeZones(ctx: CanvasRenderingContext2D) {
    for (const zone of this._regimeZones) {
      const x1 = this.mapper.timeToX(zone.timeStart)
      const x2 = this.mapper.timeToX(zone.timeEnd)
      if (x1 == null || x2 == null) continue
      ctx.fillStyle = zone.color
      ctx.fillRect(x1, 0, x2 - x1, this.overlayCanvas.height)
    }
  }

  protected drawStructureOverlay(ctx: CanvasRenderingContext2D) {
    const data = this._structureData
    if (!data) return
    const w = this.overlayCanvas.width
    const bullish = (dir: string) => dir === 'bullish' || dir === 'up' || dir === 'buy'

    // Key levels (subtle background lines)
    for (const level of data.keyLevels) {
      const y = this.mapper.priceToY(level, 0)
      if (y == null) continue
      ctx.strokeStyle = this._theme.text
      ctx.globalAlpha = 0.2
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // FVGs – translucent vertical rectangles
    for (const fvg of data.fvgs) {
      const yT = this.mapper.priceToY(fvg.top, 0)
      const yB = this.mapper.priceToY(fvg.bottom, 0)
      if (yT == null || yB == null) continue
      const y1 = Math.min(yT, yB)
      const y2 = Math.max(yT, yB)
      const isBull = bullish(fvg.direction)
      const color = isBull ? this._theme.up : this._theme.down
      ctx.fillStyle = color + '26'
      ctx.fillRect(0, y1, w, y2 - y1)
      ctx.strokeStyle = color + '66'
      ctx.lineWidth = 1
      ctx.strokeRect(0, y1, w, y2 - y1)
    }

    // Order blocks – horizontal bands with label
    ctx.font = '8px JetBrains Mono, monospace'
    ctx.textBaseline = 'middle'
    for (const ob of data.orderBlocks) {
      const y = this.mapper.priceToY(ob.level, 0)
      if (y == null) continue
      const h = Math.max(4, ob.confidence * 16)
      const isBull = bullish(ob.direction)
      const color = isBull ? this._theme.up : this._theme.down
      ctx.fillStyle = color + '40'
      ctx.fillRect(0, y - h / 2, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'right'
      ctx.fillText(`$${ob.level.toFixed(2)} ${(ob.confidence * 100).toFixed(0)}%`, w - 4, y)
    }

    // Liquidity zones – dashed horizontal lines
    ctx.setLineDash([6, 3])
    ctx.lineWidth = 2
    ctx.strokeStyle = this._theme.accentYellow
    for (const liq of data.liquidityLevels) {
      const y = this.mapper.priceToY(liq.level, 0)
      if (y == null) continue
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'right'
      ctx.fillText(`$${liq.level.toFixed(2)} ${(liq.confidence * 100).toFixed(0)}%`, w - 4, y)
    }
    ctx.setLineDash([])
  }

  protected renderOverlay() {
    const ctx = this.overlayCtx
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height)
    this.drawRegimeZones(ctx)
    this.drawStructureOverlay(ctx)
    this.drawingManager.render(ctx, 0)
    this.drawSignalMarkers(ctx)
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect()
    if (this.resizeRAF) cancelAnimationFrame(this.resizeRAF)
    if (this.clickHandler) {
      this.chart.unsubscribeClick(this.clickHandler)
      this.clickHandler = null
    }
    for (const handler of this.crosshairHandlers) {
      this.chart.unsubscribeCrosshairMove(handler)
    }
    this.crosshairHandlers = []
    if (this.overlayDiv) {
      for (const { type, handler } of this.boundHandlers) {
        this.overlayDiv.removeEventListener(type, handler)
      }
      this.boundHandlers = []
      this.overlayDiv.remove()
      this.overlayDiv = null
    }
    this.chart.remove()
    this.drawingManager.destroy()
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }
}
