import { registerCommand, type Command } from './registry'

const actions: Record<string, string> = {
  chart: '/markets/chart',
  backtest: '/strategy/backtest',
  workspace: '',
  strategy: '/strategy/lab',
  alert: '',
}

export function registerNew(navigate: (path: string) => void) {
  const cmd: Command = {
    prefix: ':new',
    description: 'Create a new item. Usage: :new <chart|backtest|strategy|workspace|alert>',
    execute: (args: string) => {
      const a = args.toLowerCase().trim()
      const dest = actions[a]
      if (dest) navigate(dest)
    },
    suggest: (partial: string) => {
      const lower = partial.toLowerCase()
      return Object.keys(actions).filter((k) => k.startsWith(lower))
    },
  }
  registerCommand(cmd)
}
