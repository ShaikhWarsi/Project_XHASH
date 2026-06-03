import type { Time } from 'lightweight-charts'
import type { ChartThemeColors } from '../ChartTheme'

export interface ChartAlert {
  id: string
  symbol: string
  type: 'price_above' | 'price_below' | 'price_cross' | 'indicator' | 'pattern_break'
  price?: number
  indicatorName?: string
  indicatorValue?: number
  note?: string
  createdAt: number
  triggeredAt?: number
  triggered: boolean
  color: string
  markerTime?: Time
  markerPrice?: number
}

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

const STORAGE_KEY = 'chart_alerts'

export class ChartAlertSystem {
  private alerts: ChartAlert[] = []
  private listeners: Set<(alerts: ChartAlert[]) => void> = new Set()

  constructor() {
    this.loadFromStorage()
  }

  createPriceAlert(symbol: string, price: number, type: 'above' | 'below' | 'cross'): ChartAlert {
    const alertTypeMap = {
      above: 'price_above' as const,
      below: 'price_below' as const,
      cross: 'price_cross' as const,
    }

    const alert: ChartAlert = {
      id: this.generateId(),
      symbol,
      type: alertTypeMap[type],
      price,
      createdAt: Date.now(),
      triggered: false,
      color: type === 'above' ? '#26a69a' : type === 'below' ? '#ef5350' : '#ffd54f',
      markerPrice: price,
    }

    this.alerts.push(alert)
    this.saveToStorage()
    this.notifyListeners()
    return alert
  }

  createIndicatorAlert(
    symbol: string,
    indicator: string,
    value: number,
    _direction: 'above' | 'below'
  ): ChartAlert {
    const alert: ChartAlert = {
      id: this.generateId(),
      symbol,
      type: 'indicator',
      price: value,
      indicatorName: indicator,
      indicatorValue: value,
      createdAt: Date.now(),
      triggered: false,
      color: '#3b82f6',
    }

    this.alerts.push(alert)
    this.saveToStorage()
    this.notifyListeners()
    return alert
  }

  checkAlerts(currentPrice: number): ChartAlert[] {
    const triggered: ChartAlert[] = []

    for (const alert of this.alerts) {
      if (alert.triggered) continue

      let shouldTrigger = false

      switch (alert.type) {
        case 'price_above':
          shouldTrigger = alert.price != null && currentPrice > alert.price
          break
        case 'price_below':
          shouldTrigger = alert.price != null && currentPrice < alert.price
          break
        case 'price_cross':
          shouldTrigger = alert.price != null && Math.abs(currentPrice - alert.price) / alert.price < 0.001
          break
        case 'indicator':
          shouldTrigger = alert.indicatorValue != null &&
            currentPrice >= alert.indicatorValue
          break
        case 'pattern_break':
          shouldTrigger = alert.price != null && currentPrice > alert.price
          break
      }

      if (shouldTrigger) {
        alert.triggered = true
        alert.triggeredAt = Date.now()
        triggered.push(alert)
      }
    }

    if (triggered.length > 0) {
      this.saveToStorage()
      this.notifyListeners()
    }

    return triggered
  }

  removeAlert(id: string): void {
    this.alerts = this.alerts.filter((a) => a.id !== id)
    this.saveToStorage()
    this.notifyListeners()
  }

  clearTriggered(): void {
    this.alerts = this.alerts.filter((a) => !a.triggered)
    this.saveToStorage()
    this.notifyListeners()
  }

  getActiveAlerts(): ChartAlert[] {
    return this.alerts.filter((a) => !a.triggered)
  }

  getTriggeredAlerts(): ChartAlert[] {
    return this.alerts.filter((a) => a.triggered)
  }

  getAllAlerts(): ChartAlert[] {
    return [...this.alerts]
  }

  saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts))
    } catch {
      console.warn('[ChartAlertSystem] Failed to persist alerts')
    }
  }

  loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        this.alerts = JSON.parse(raw)
      }
    } catch {
      this.alerts = []
    }
  }

  onChange(callback: (alerts: ChartAlert[]) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  renderAlertMarkers(
    ctx: CanvasRenderingContext2D,
    alertList: ChartAlert[],
    mapper: CoordMapper,
    canvasWidth: number,
    theme: ChartThemeColors
  ): void {
    ctx.save()

    for (const alert of alertList) {
      if (alert.markerPrice == null) continue

      const y = mapper.priceToY(alert.markerPrice)
      if (y == null) continue

      const isTriggered = alert.triggered
      const color = isTriggered ? theme.text : alert.color
      ctx.globalAlpha = isTriggered ? 0.4 : 1

      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
      ctx.setLineDash([])

      const label = isTriggered
        ? `✓ $${alert.price?.toFixed(2)}`
        : `🔔 $${alert.price?.toFixed(2)}`

      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      const labelW = ctx.measureText(label).width + 8
      ctx.fillRect(2, y - 14, labelW, 14)
      ctx.fillStyle = color
      ctx.fillText(label, 6, y - 2)
    }

    ctx.globalAlpha = 1
    ctx.restore()
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener([...this.alerts])
    }
  }
}
