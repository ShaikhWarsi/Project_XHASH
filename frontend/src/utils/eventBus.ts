const _handlers = new Map<string, Set<(...args: any[]) => void>>()

export const eventBus = {
  on(event: string, handler: (...args: any[]) => void) {
    if (!_handlers.has(event)) _handlers.set(event, new Set())
    _handlers.get(event)!.add(handler)
    return () => { _handlers.get(event)?.delete(handler) }
  },
  emit(event: string, ...args: any[]) {
    _handlers.get(event)?.forEach((h) => { try { h(...args) } catch {} })
  },
  off(event: string, handler: (...args: any[]) => void) {
    _handlers.get(event)?.delete(handler)
  },
}

export const EVENTS = {
  SIGNAL_SELECTED: 'signal:selected',
  SYMBOL_CHANGED: 'symbol:changed',
  PORTFOLIO_UPDATED: 'portfolio:updated',
  REGIME_CHANGED: 'regime:changed',
  BACKTEST_COMPLETE: 'backtest:complete',
  ORDER_PLACED: 'order:placed',
  THEME_CHANGED: 'theme:changed',
  TAB_CHANGED: 'tab:changed',
  REFRESH_REQUESTED: 'refresh:requested',
} as const
