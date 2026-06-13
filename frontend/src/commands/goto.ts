import { registerCommand, type Command } from './registry'

const destinations: Record<string, string> = {
  dashboard: '/markets/dashboard',
  portfolio: '/trading/portfolio',
  orders: '/trading/orders',
  chart: '/markets/chart',
  backtest: '/strategy/backtest',
  agents: '/ai/agents',
  settings: '/settings',
  risk: '/risk',
  signals: '/markets/signals',
  watchlist: '/markets/watchlist',
  debug: '/debug',
  workflow: '/data/workflows',
  pipeline: '/data/pipeline',
  lab: '/strategy/lab',
  paper: '/trading/paper-trading',
}

export function registerGoto(navigate: (path: string) => void) {
  const cmd: Command = {
    prefix: ':goto',
    description: 'Navigate to a page. Usage: :goto <page>',
    execute: (args: string) => {
      const dest = destinations[args.toLowerCase().trim()]
      if (dest) navigate(dest)
    },
    suggest: (partial: string) => {
      const lower = partial.toLowerCase()
      return Object.keys(destinations)
        .filter((k) => k.startsWith(lower))
        .map((k) => `${k}`)
    },
  }
  registerCommand(cmd)
}
