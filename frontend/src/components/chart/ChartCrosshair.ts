import { type IChartApi, type Time } from 'lightweight-charts'

/**
 * Syncs crosshair position across multiple chart panes.
 * lightweight-charts v5 has crosshair().setPosition() for programmatic control.
 */
export class ChartCrosshair {
  private targetCharts: IChartApi[] = []

  constructor(_sourceChart: IChartApi) {
  }

  addTarget(chart: IChartApi) {
    this.targetCharts.push(chart)
  }

  removeTarget(chart: IChartApi) {
    this.targetCharts = this.targetCharts.filter((c) => c !== chart)
  }

  setPosition(time: Time, price: number) {
    for (const tc of this.targetCharts) {
      ;(tc as any).crosshair().setPosition(time, price)
    }
  }

  clear() {
    for (const tc of this.targetCharts) {
      ;(tc as any).crosshair().clearPosition()
    }
  }
}
