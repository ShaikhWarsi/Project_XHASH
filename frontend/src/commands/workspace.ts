import { registerCommand, type Command } from './registry'

export function registerWorkspace() {
  const cmd: Command = {
    prefix: ':workspace',
    description: 'Manage workspaces. Usage: :workspace <save|load|list> [name]',
    execute: (args: string) => {
      console.log('[Command] workspace:', args)
    },
    suggest: (_partial: string) => ['save', 'load', 'list'],
  }
  registerCommand(cmd)
}
