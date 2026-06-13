import { registerCommand, type Command } from './registry'
import type { ThemeName } from '../contexts/ThemeContext'

export function registerTheme(setTheme: (t: ThemeName) => void) {
  const themes: ThemeName[] = ['classic', 'matrix', 'amber', 'cyber', 'terminal', 'light', 'highcontrast', 'sunlight', 'auto']
  const cmd: Command = {
    prefix: ':theme',
    description: 'Switch theme. Usage: :theme <name>',
    execute: (args: string) => {
      const t = args.toLowerCase().trim()
      if ((themes as string[]).includes(t)) setTheme(t as ThemeName)
    },
    suggest: (partial: string) => {
      const lower = partial.toLowerCase()
      return themes.filter((t) => t.startsWith(lower))
    },
  }
  registerCommand(cmd)
}
