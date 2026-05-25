import { createChart, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type Time, type CandlestickData, type HistogramData } from 'lightweight-charts'
import { CoordMapper } from './CoordMapper'
import { DrawingManager } from './drawings/DrawingManager'
import type { ToolType, IndicatorConfig } from './DrawingTypes'

export interface ChartOptions {
  symbol: string
  interval: string
  data: CandlestickData[]
  container: HTMLDivElement
  width: number
  height: number
}

export interface ChartCallbacks {
  onCrosshairMove?: (params: { time: Time | null; price: number | null }) => void
  onSymbolChange?: (symbol: string) => void
  onIntervalChange?: (interval: string) => void
}

export class ChartEngine {
  readonly chart: IChartApi
  readonly mapper: CoordMapper
  readonly drawingManager: DrawingManager
  private container: HTMLDivElement
  private overlayCanvas: HTMLCanvasElement
  private overlayCtx: CanvasRenderingContext2D
  private resizeObserver: ResizeObserver
  private animationFrameId = 0
  private callbacks: ChartCallbacks = {}
  private mainSeries: ISeriesApi<'Candlestick'> | null = null
  private volumeSeries: ISeriesApi<'Histogram'> | null = null
  private _symbol: string
  private _interval: string

  constructor(options: ChartOptions, callbacks?: ChartCallbacks) {
    this._symbol = options.symbol
    this._interval = options.interval
    this.container = options.container
    this.callbacks = callbacks ?? {}

    // Create lightweight-charts instance
    this.chart = createChart(options.container, {
      width: options.width,
      height: options.height,
      layout: {
        background: { color: '#0a0e14' },
        textColor: '#5d6b7e',
      },
      grid: {
        vertLines: { color: '#1a2332' },
        horzLines: { color: '#1a2332' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#3b82f6', width: 1, labelBackgroundColor: '#3b82f6' },
        horzLine: { color: '#3b82f6', width: 1, labelBackgroundColor: '#3b82f6' },
      },
      timeScale: {
        borderColor: '#1a2332',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1a2332',
        scaleMargins: { top: 0.1, bottom: 0.3 },
      },
    })

    this.mapper = new CoordMapper(this.chart)
    this.drawingManager = new DrawingManager(this.chart, this.mapper)

    // Create overlay canvas
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

    // Set up resize observer
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.chart.resize(width, height)
        this.overlayCanvas.width = width
        this.overlayCanvas.height = height
        this.requestRender()
      }
    })
    this.resizeObserver.observe(options.container)

    // Event delegation for drawing
    this.setupCanvasEvents()

    // Set up initial series
    this.setMainSeries(options.data)

    // Crosshair listener
    this.chart.subscribeCrosshairMove((param) => {
      this.requestRender()
      this.callbacks.onCrosshairMove?.({
        time: param.time ?? null,
        price: param.seriesData?.get?.(this.mainSeries!) as any ?? null,
      })
    })

    // Set up auto-render loop
    this.chart.subscribeCrosshairMove(() => this.requestRender())

    // Load drawings from storage
    const storageKey = `${this._symbol}_${this._interval}`
    this.drawingManager.loadFromStorage(storageKey)
    this.drawingManager.setOnChanged(() => this.requestRender())
  }

  private setupCanvasEvents() {
    // We attach mouse events to the chart container for drawing tool interaction
    // lightweight-charts handles its own events on the canvas; we use a separate
    // overlay approach with pointerEvents: 'none' and instead add a transparent
    // div overlay for drawing mouse events
    const overlay = document.createElement('div')
    overlay.style.position = 'absolute'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.zIndex = '5'
    overlay.style.cursor = 'crosshair'
    this.container.appendChild(overlay)

    overlay.addEventListener('mousedown', (e) => {
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(e.clientX - rect.left, e.clientY - rect.top, e)
      this.drawingManager.handleMouseDown(event)
      this.requestRender()
    })

    overlay.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(e.clientX - rect.left, e.clientY - rect.top, e)
      this.drawingManager.handleMouseMove(event)
      this.requestRender()
    })

    overlay.addEventListener('mouseup', (e) => {
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(e.clientX - rect.left, e.clientY - rect.top, e)
      this.drawingManager.handleMouseUp(event)
      this.requestRender()
    })

    overlay.addEventListener('dblclick', (e) => {
      const rect = this.container.getBoundingClientRect()
      const event = this.makeDrawingEvent(e.clientX - rect.left, e.clientY - rect.top, e)
      this.drawingManager.handleDblClick(event)
      this.requestRender()
    })
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

  setInterval(interval: string) {
    this._interval = interval
    const storageKey = `${this._symbol}_${interval}`
    this.drawingManager.loadFromStorage(storageKey)
    this.drawingManager.setStorageKey(storageKey)
    this.callbacks.onIntervalChange?.(interval)
  }

  setMainSeries(data: CandlestickData[]) {
    if (this.mainSeries) {
      this.mainSeries.setData(data)
      return
    }
    this.mainSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })
    this.mainSeries.setData(data)
    this.mapper.registerPane('main', this.mainSeries)

    // Volume
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

  updateData(data: CandlestickData[]) {
    this.mainSeries?.setData(data)
    const volumeData: HistogramData[] = data.map((d) => ({
      time: d.time,
      value: d.close > d.open ? ((d as any).volume ?? 0) : -((d as any).volume ?? 0),
      color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    }))
    this.volumeSeries?.setData(volumeData)
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
  }

  requestRender() {
    if (this.animationFrameId) return
    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = 0
      this.renderOverlay()
    })
  }

  private renderOverlay() {
    const ctx = this.overlayCtx
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height)
    this.drawingManager.render(ctx, 0)
  }

  seekToIndex(index: number, data: CandlestickData[]) {
    if (index < 0 || index >= data.length) return
    const from = data[0].time
    const to = data[index].time
    this.chart.timeScale().setVisibleRange({ from, to } as any)

    if (this.mainSeries) {
      const subset = data.slice(0, index + 1)
      this.mainSeries.setData(subset)
      const volumeData: HistogramData[] = subset.map((d) => ({
        time: d.time,
        value: d.close > d.open ? ((d as any).volume ?? 0) : -((d as any).volume ?? 0),
        color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
      }))
      this.volumeSeries?.setData(volumeData)
    }
  }

  fitContent() {
    this.chart.timeScale().fitContent()
  }

  addIndicator(_config: IndicatorConfig) {
    // TODO: Phase 3 - indicator pane support
  }

  removeIndicator(_id: string) {
    // TODO: Phase 3 - indicator pane support
  }

  get symbol() { return this._symbol }
  get interval() { return this._interval }

  destroy() {
    this.resizeObserver.disconnect()
    this.chart.remove()
    this.drawingManager.saveToStorage()
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }
}
