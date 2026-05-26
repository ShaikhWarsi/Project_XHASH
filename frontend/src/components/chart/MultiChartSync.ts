import { type IChartApi, type Time } from 'lightweight-charts'

export interface ChartInstance {
  id: string
  symbol: string
  chart: IChartApi
}

export type SeekMode = 'index' | 'time'

export interface TimeMachineState {
  playing: boolean
  speed: number
  currentIndex: number
  totalLength: number
}

export class MultiChartSync {
  private charts: Map<string, ChartInstance> = new Map()
  private onSeekCallbacks: Map<string, (index: number) => void> = new Map()
  private _currentTime: Time | null = null
  private _currentIndex: number = 0
  private _totalLength: number = 0

  register(chart: ChartInstance, onSeek?: (index: number) => void): void {
    this.charts.set(chart.id, chart)
    if (onSeek) {
      this.onSeekCallbacks.set(chart.id, onSeek)
    }
  }

  unregister(id: string): void {
    this.charts.delete(id)
    this.onSeekCallbacks.delete(id)
  }

  getChart(id: string): ChartInstance | undefined {
    return this.charts.get(id)
  }

  getAllCharts(): ChartInstance[] {
    return Array.from(this.charts.values())
  }

  getChartCount(): number {
    return this.charts.size
  }

  seekToIndex(index: number, totalLength: number): void {
    this._currentIndex = Math.max(0, Math.min(index, totalLength - 1))
    this._totalLength = totalLength

    for (const [id, callback] of this.onSeekCallbacks) {
      callback(this._currentIndex)
    }
  }

  syncCrosshairTime(time: Time | null): void {
    this._currentTime = time
    for (const { chart } of this.charts.values()) {
      try {
        if (time) {
          ;(chart as any).crosshair().setPosition(time as any, 0)
        } else {
          ;(chart as any).crosshair().clearPosition()
        }
      } catch {}
    }
  }

  syncVisibleRange(timeScale: any): void {
    try {
      if (!timeScale || typeof timeScale.getVisibleRange !== 'function') return
      const range = timeScale.getVisibleRange()
      if (!range) return

      for (const { chart } of this.charts.values()) {
        try {
          chart.timeScale().setVisibleRange(range)
        } catch {}
      }
    } catch {}
  }

  get currentIndex(): number {
    return this._currentIndex
  }

  get currentTime(): Time | null {
    return this._currentTime
  }

  destroy(): void {
    this.charts.clear()
    this.onSeekCallbacks.clear()
  }
}
