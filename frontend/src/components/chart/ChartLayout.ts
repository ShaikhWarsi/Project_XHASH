import { type Time } from 'lightweight-charts'
import { ChartPane } from './ChartPane'
import type { ChartLayer } from './LayerPanel'

type LayoutMode = 'single' | '2x1' | '1x2' | '2x2' | 'custom'

export class ChartLayout {
  private panes: ChartPane[] = []
  private mainPane: ChartPane | null = null
  private container: HTMLDivElement
  private totalHeight: number
  private mode: LayoutMode = 'single'

  constructor(container: HTMLDivElement, height: number) {
    this.container = container
    this.totalHeight = height
  }

  setMode(mode: LayoutMode) {
    this.mode = mode
    this.rebuild()
  }

  getMode(): LayoutMode {
    return this.mode
  }

  private rebuild() {
    for (const pane of this.panes) {
      pane.destroy()
    }
    this.panes = []
    this.mainPane = null

    const paneCount = this.mode === 'single' ? 1 : this.mode === '2x1' || this.mode === '1x2' ? 2 : 4

    for (let i = 0; i < paneCount; i++) {
      const type = i === 0 ? 'price' : 'indicator'
      this.addPaneInternal(type)
    }
  }

  private addPaneInternal(type: 'price' | 'indicator', indicatorId?: string): ChartPane {
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

  addPane(type: 'price' | 'indicator', indicatorId?: string): ChartPane {
    return this.addPaneInternal(type, indicatorId)
  }

  private calculateHeight(type: 'price' | 'indicator'): number {
    if (this.mode === 'single') {
      return type === 'price' ? this.totalHeight : Math.floor(this.totalHeight * 0.3)
    }
    if (this.mode === '2x1') {
      return Math.floor(this.totalHeight / 2)
    }
    if (this.mode === '1x2') {
      return type === 'price' ? Math.floor(this.totalHeight * 0.7) : Math.floor(this.totalHeight * 0.3)
    }
    if (this.mode === '2x2') {
      return Math.floor(this.totalHeight / 2)
    }
    if (type === 'price') {
      return Math.floor(this.totalHeight * 0.7)
    }
    return Math.floor(this.totalHeight * 0.3)
  }

  getLayerData(): ChartLayer[] {
    return this.panes.map((pane, i) => ({
      id: pane.id,
      name: pane.type === 'price' ? `Price ${i + 1}` : pane.indicatorId ?? `Indicator ${i + 1}`,
      type: pane.type === 'price' ? 'candle' : 'indicator',
      visible: true,
      opacity: 1,
      order: i,
      refType: pane.type,
    }))
  }

  syncLayers(layers: ChartLayer[]) {
    for (const layer of layers) {
      const pane = this.panes.find((p) => p.id === layer.id)
      if (!pane) continue
      if (!layer.visible) {
        pane.chart.applyOptions({ handleScroll: false, handleScale: false })
      } else {
        pane.chart.applyOptions({ handleScroll: true, handleScale: true })
      }
    }
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
      try {
        ;(pane.chart as any).crosshair().setPosition(time, 0)
      } catch {}
    }
  }

  syncTimeScales() {
    const main = this.mainPane?.chart.timeScale()
    if (!main) return
    try {
      const range = main.getVisibleRange()
      if (!range) return
      for (const pane of this.panes) {
        if (pane === this.mainPane) continue
        try {
          pane.chart.timeScale().setVisibleRange(range)
        } catch {}
      }
    } catch {}
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
