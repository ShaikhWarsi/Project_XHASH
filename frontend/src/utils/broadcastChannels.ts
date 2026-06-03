export const TE_SYNC = 'te-sync'
export const TE_CHART = 'te-chart'

export interface SyncEvent {
  type: 'SYMBOL_CHANGED' | 'THEME_CHANGED' | 'ALERT_TRIGGERED' | 'BACKTEST_COMPLETE' | 'ORDER_PLACED' | 'PORTFOLIO_UPDATED'
  payload: Record<string, unknown>
  tabId: string
  timestamp: number
}

let tabId: string | null = null

export function getTabId(): string {
  if (!tabId) {
    const stored = sessionStorage.getItem('te_tab_id')
    if (stored) {
      tabId = stored
    } else {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem('te_tab_id', tabId)
    }
  }
  return tabId
}

export function getPrimaryTabId(): string | null {
  try {
    const raw = localStorage.getItem('te_primary_tab')
    return raw
  } catch {
    return null
  }
}

export function setPrimaryTabId(id: string) {
  try {
    localStorage.setItem('te_primary_tab', id)
  } catch {}
}

export function createSyncChannel(name: string = TE_SYNC): BroadcastChannel | null {
  try {
    return new BroadcastChannel(name)
  } catch {
    return null
  }
}
