import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts'

/**
 * Maps between chart coordinates (time, price) and canvas coordinates (x, y).
 * Bridge between lightweight-charts and the canvas overlay.
 */
export class CoordMapper {
  private chart: IChartApi
  private panes: { id: string; series: ISeriesApi<any> }[] = []

  constructor(chart: IChartApi) {
    this.chart = chart
  }

  registerPane(id: string, series: ISeriesApi<any>) {
    this.panes.push({ id, series })
  }

  unregisterPane(id: string) {
    this.panes = this.panes.filter((p) => p.id !== id)
  }

  /** Convert a Time to pixel x-coordinate. */
  timeToX(time: Time): number | null {
    return this.chart.timeScale().timeToCoordinate(time) ?? null
  }

  /** Convert a pixel to Time. */
  xToTime(x: number): Time | null {
    const time = this.chart.timeScale().coordinateToTime(x)
    return time ?? null
  }

  /** Convert a price to pixel y in the given pane. */
  priceToY(price: number, paneIndex = 0): number | null {
    const series = this.panes[paneIndex]?.series
    if (!series) return null
    return series.priceToCoordinate(price) ?? null
  }

  /** Convert a pixel y to price in the given pane. */
  yToPrice(y: number, paneIndex = 0): number | null {
    const series = this.panes[paneIndex]?.series
    if (!series) return null
    return series.coordinateToPrice(y) ?? null
  }

  /** Get the visible bounds of the chart. */
  getVisibleBounds() {
    const timeRange = this.chart.timeScale().getVisibleRange()
    const logRange = this.chart.timeScale().getVisibleLogicalRange()
    return { timeRange, logRange }
  }

  /** Get the width of the chart canvas. */
  getWidth(): number {
    return this.chart.timeScale().width() ?? 0
  }

  /** Fit the chart content into view. */
  fitContent() {
    this.chart.timeScale().fitContent()
  }

  /** Get the price scale's height for a given pane. */
  getPaneHeight(paneIndex = 0): number {
    try {
      const id = paneIndex === 0 ? 'right' : `pane_${paneIndex}`
      const scale = this.chart.priceScale(id)
      if (scale && typeof (scale as any).height === 'function') {
        return (scale as any).height() ?? 300
      }
    } catch { /* lightweight-charts may not expose height */ }
    return 300
  }
}
