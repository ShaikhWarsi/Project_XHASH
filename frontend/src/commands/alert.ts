import { registerCommand, type Command } from './registry'

export function registerAlert() {
  const cmd: Command = {
    prefix: ':alert',
    description: 'Create an alert. Usage: :alert <symbol> <condition> <value>',
    execute: (args: string) => {
      console.log('[Command] alert:', args)
    },
    suggest: (_partial: string) => [],
  }
  registerCommand(cmd)
}
