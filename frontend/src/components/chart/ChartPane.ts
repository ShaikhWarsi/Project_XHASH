import { type IChartApi, type ISeriesApi, type CandlestickData, type LineData, type HistogramData, createChart, CrosshairMode } from 'lightweight-charts'
import { CoordMapper } from './CoordMapper'

export class ChartPane {
  readonly id: string
  readonly type: 'price' | 'indicator'
  indicatorId?: string
  chart: IChartApi
  series: ISeriesApi<any> | null = null
  mapper: CoordMapper
  height: number
  private container: HTMLDivElement

  constructor(id: string, type: 'price' | 'indicator', container: HTMLDivElement, height: number, indicatorId?: string) {
    this.id = id
    this.type = type
    this.indicatorId = indicatorId
    this.height = height
    this.container = container

    this.chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#5d6b7e',
      },
      grid: {
        vertLines: { color: '#1a2332' },
        horzLines: { color: '#1a2332' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
      timeScale: {
        visible: false,
      },
      rightPriceScale: {
        borderColor: '#1a2332',
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      handleScroll: false,
      handleScale: false,
    })

    this.mapper = new CoordMapper(this.chart)
  }

  setSeries(series: ISeriesApi<any>) {
    this.series = series
    this.mapper.registerPane(this.id, series)
  }

  setHeight(h: number) {
    this.height = h
    this.chart.resize(this.container.clientWidth, h)
  }

  setData(data: CandlestickData[] | LineData[] | HistogramData[]) {
    this.series?.setData(data as any)
    this.chart.timeScale().fitContent()
  }

  syncTimeScale(mainTimeScale: any) {
    // Sync this pane's time scale with the main chart
    const range = mainTimeScale.getVisibleRange()
    if (range) {
      this.chart.timeScale().setVisibleRange(range)
    }
  }

  destroy() {
    this.chart.remove()
  }
}
