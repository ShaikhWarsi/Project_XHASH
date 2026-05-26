export interface DashboardLayout {
  id: string
  name: string
  description: string
  items: string[]
}

export const DASHBOARD_TEMPLATES: DashboardLayout[] = [
  {
    id: 'trading',
    name: 'Trading',
    description: 'Chart + Order Book + Positions',
    items: ['kpis', 'positions-signals', 'equity-curve', 'risk-status', 'top-movers', 'risk-metrics'],
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Screener + Charts + Market Data',
    items: ['screener', 'heatmap', 'equity-curve', 'top-movers', 'sector-allocation', 'attribution'],
  },
  {
    id: 'risk',
    name: 'Risk',
    description: 'Portfolio + Risk Metrics + HeatMap',
    items: ['kpis', 'risk-metrics', 'risk-status', 'heatmap', 'sector-allocation', 'positions-signals'],
  },
  {
    id: 'default',
    name: 'Default',
    description: 'KPI cards + positions + equity curve',
    items: ['kpis', 'positions-signals', 'equity-curve', 'risk-status', 'sector-allocation'],
  },
]

export function loadLayout(templateId: string): string[] | null {
  const saved = localStorage.getItem('dashboard_layout')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }
  const template = DASHBOARD_TEMPLATES.find((t) => t.id === templateId)
  return template ? [...template.items] : null
}

export function saveLayout(items: string[]): void {
  localStorage.setItem('dashboard_layout', JSON.stringify(items))
}

export function applyTemplate(templateId: string): string[] {
  const template = DASHBOARD_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return []
  saveLayout(template.items)
  return [...template.items]
}
