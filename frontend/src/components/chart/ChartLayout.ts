import { type Time } from 'lightweight-charts'
import { ChartPane } from './ChartPane'

export class ChartLayout {
  private panes: ChartPane[] = []
  private mainPane: ChartPane | null = null
  private container: HTMLDivElement
  private totalHeight: number

  constructor(container: HTMLDivElement, height: number) {
    this.container = container
    this.totalHeight = height
  }

  addPane(type: 'price' | 'indicator', indicatorId?: string): ChartPane {
    const id = `pane_${this.panes.length + 1}_${Date.now()}`
    const paneDiv = document.createElement('div')
    paneDiv.style.width = '100%'
    paneDiv.style.height = `${this.calculateHeight(type)}px`
    this.container.appendChild(paneDiv)

    const pane = new ChartPane(id, type, paneDiv, this.calculateHeight(type), indicatorId)
    this.panes.push(pane)

    if (type === 'price' && !this.mainPane) {
      this.mainPane = pane
    }

    return pane
  }

  private calculateHeight(type: 'price' | 'indicator'): number {
    if (type === 'price') {
      return Math.floor(this.totalHeight * 0.7)
    }
    return Math.floor(this.totalHeight * 0.3)
  }

  removePane(id: string) {
    const idx = this.panes.findIndex((p) => p.id === id)
    if (idx === -1) return
    this.panes[idx].destroy()
    this.panes.splice(idx, 1)
    if (this.mainPane?.id === id) {
      this.mainPane = this.panes.find((p) => p.type === 'price') ?? null
    }
  }

  getMainPane(): ChartPane | null { return this.mainPane }
  getPanes(): ChartPane[] { return this.panes }

  syncCrosshair(time: Time | null) {
    if (!time) return
    for (const pane of this.panes) {
      if (pane === this.mainPane) continue
      ;(pane.chart as any).crosshair().setPosition(time, 0)
    }
  }

  resize(height: number) {
    this.totalHeight = height
    for (const pane of this.panes) {
      const h = pane.type === 'price'
        ? Math.floor(height * 0.7)
        : Math.floor(height * 0.3)
      pane.setHeight(h)
    }
  }

  destroy() {
    for (const pane of this.panes) {
      pane.destroy()
    }
    this.panes = []
    this.mainPane = null
  }
}
