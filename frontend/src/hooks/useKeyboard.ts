import { useEffect, useCallback } from 'react'

const MOD: 'metaKey' | 'ctrlKey' = navigator.platform.startsWith('Mac') ? 'metaKey' : 'ctrlKey'

type Binding = {
  key: string
  ctrl?: boolean
  shift?: boolean
  handler: () => void
}

export function useKeyboard(bindings: Binding[], enabled = true) {
  const stableBindings = useCallback(() => bindings, [bindings])

  useEffect(() => {
    if (!enabled) return
    const items = stableBindings()
    const handler = (e: KeyboardEvent) => {
      for (const b of items) {
        const ctrlOk = b.ctrl ? e[MOD] : !e[MOD]
        const shiftOk = b.shift ? e.shiftKey : !e.shiftKey
        if (e.key.toLowerCase() === b.key.toLowerCase() && ctrlOk && shiftOk) {
          e.preventDefault()
          b.handler()
          return
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, stableBindings])
}

export const SHORTCUTS = {
  dashboard: { key: '1', ctrl: true },
  portfolio: { key: '2', ctrl: true },
  signals: { key: '3', ctrl: true },
  trades: { key: '4', ctrl: true },
  backtest: { key: '5', ctrl: true },
  charts: { key: '6', ctrl: true },
  structure: { key: '7', ctrl: true },
  agents: { key: '8', ctrl: true },
  hedgeFund: { key: '9', ctrl: true },
  hedgeFlow: { key: '0', ctrl: true },
  orders: { key: 'o', ctrl: true },
  risk: { key: 'r', ctrl: true },
}
