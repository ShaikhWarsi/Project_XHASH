export interface Command {
  prefix: string
  description: string
  execute: (args: string) => void
  suggest: (partial: string) => string[]
}

const commands = new Map<string, Command>()

export function registerCommand(cmd: Command) {
  commands.set(cmd.prefix, cmd)
}

export function executeCommand(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed.startsWith(':')) return false
  const spaceIdx = trimmed.indexOf(' ')
  const prefix = spaceIdx > 0 ? trimmed.substring(0, spaceIdx) : trimmed
  const args = spaceIdx > 0 ? trimmed.substring(spaceIdx + 1).trim() : ''
  const cmd = commands.get(prefix)
  if (!cmd) return false
  cmd.execute(args)
  return true
}

export function getSuggestions(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed.startsWith(':')) return []
  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx > 0) {
    const prefix = trimmed.substring(0, spaceIdx)
    const args = trimmed.substring(spaceIdx + 1)
    const cmd = commands.get(prefix)
    if (cmd) return cmd.suggest(args)
    return []
  }
  const partial = trimmed.substring(1)
  const results: string[] = []
  for (const [prefix, cmd] of commands) {
    if (prefix.substring(1).startsWith(partial)) {
      results.push(`${prefix} `)
    }
  }
  return results
}

export function getCommandList(): { prefix: string; description: string }[] {
  const list: { prefix: string; description: string }[] = []
  for (const cmd of commands.values()) {
    list.push({ prefix: cmd.prefix, description: cmd.description })
  }
  return list
}
