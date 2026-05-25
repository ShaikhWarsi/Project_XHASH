import { useEffect, useState } from 'react'

const HELP_TEXT = `
TE$ TRADING ENGINE — KEYBOARD SHORTCUTS
────────────────────────────────────────
  ^1-9      NAVIGATE TO PAGES
  ^O        ORDERS
  ^R        RISK
  ^K        COMMAND PALETTE
  ^J        STOCK SEARCH
  ESC       CLOSE MODALS
  ESC+      CLOSE THIS HELP
  T         CYCLE THEMES (Ctrl+T)

MOUSE:
  HOVER     PAUSE TICKER SCROLL
  CLICK     NAVLINK SIDEBAR NAVIGATION

PAGES:
  /          DASHBOARD
  /PORTFOLIO PORTFOLIO
  /SIGNALS   SIGNALS
  /TRADES    TRADES
  /ORDERS    ORDERS
  /BACKTEST  BACKTEST
  /CHART     CHARTS
  /STRUCTURE MARKET STRUCTURE
  /AGENTS    AI AGENTS
  /HEDGE-FUND HEDGE FUND
  /HEDGE-FLOW FLOW BUILDER
  /RISK      RISK DASHBOARD
  /CFA       FINANCIAL CALCULATOR
  /MMC       MARKET MICROSTRUCTURE
  /PAPER-TRADING PAPER TRADING
  /WATCHLIST WATCHLIST
  /STRATEGY-LAB STRATEGY BUILDER
  /SETTINGS  SETTINGS
`

export default function useHelp() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !(e.metaKey || e.ctrlKey)) {
        setShow((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const helpOverlay = show ? (
    <div
      onClick={() => setShow(false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 'var(--z-modal)', fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, whiteSpace: 'pre-wrap' as const,
        color: 'var(--text-primary)', cursor: 'pointer',
      }}
    >
      <pre
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: 24, maxWidth: 520,
          lineHeight: 1.6, color: 'var(--text-secondary)',
        }}
      >
        {HELP_TEXT}
      </pre>
    </div>
  ) : null

  return { helpOverlay, showHelp: show, setHelp: setShow }
}
