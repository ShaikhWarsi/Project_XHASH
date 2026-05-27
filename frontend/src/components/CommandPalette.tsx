import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ThemeName } from '../contexts/ThemeContext'
import { ROUTES, GROUP_LABELS } from '../utils/routes'

const MOD_KEY = navigator.platform.startsWith('Mac') ? '\u2318' : '^'
const RECENT_KEY = 'cmd_palette_recent'
const MAX_RECENT = 8

interface Command {
  id: string
  label: string
  path: string
  keys?: string
  category: string
  action?: string
  description?: string
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  let score = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1 + (qi === 0 ? 5 : 0)
      qi++
    }
  }
  return qi === q.length ? score : 0
}

function getRecentCommands(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') }
  catch { return [] }
}

function addRecentCommand(id: string) {
  const recent = getRecentCommands().filter((r) => r !== id)
  recent.unshift(id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

const SHORTCUT_MAP: Record<string, string> = {
  '/': `${MOD_KEY}1`, '/markets/chart': `${MOD_KEY}2`, '/markets/watchlist': `${MOD_KEY}3`,
  '/markets/signals': `${MOD_KEY}4`, '/trading/orders': `${MOD_KEY}5`, '/trading/portfolio': `${MOD_KEY}6`,
  '/risk': `${MOD_KEY}7`, '/ai/agents': `${MOD_KEY}8`,
  '/strategy/backtest': `${MOD_KEY}9`, '/ai/llm': `${MOD_KEY}0`,
  '/trading/trades': `${MOD_KEY}T`, '/settings': `${MOD_KEY}O`,
}

const NAV_COMMANDS: Command[] = ROUTES.map((r) => ({
  id: r.path,
  label: r.label,
  path: r.path,
  keys: SHORTCUT_MAP[r.path],
  category: GROUP_LABELS[r.group] || r.group.toUpperCase(),
  description: r.path,
}))

const THEME_COMMANDS: Command[] = [
  { id: 'theme-classic', label: 'Switch Theme: Classic', path: '__theme_classic', category: 'Theme', action: '\u25CB' },
  { id: 'theme-cyber', label: 'Switch Theme: Cyber', path: '__theme_cyber', category: 'Theme', action: '\u25CB' },
  { id: 'theme-terminal', label: 'Switch Theme: Terminal', path: '__theme_terminal', category: 'Theme', action: '\u25CB' },
  { id: 'theme-light', label: 'Switch Theme: Light', path: '__theme_light', category: 'Theme', action: '\u25CB' },
]

const ACTION_COMMANDS: Command[] = [
  { id: 'quick-backtest', label: 'New Backtest', path: '/strategy/backtest', category: 'Actions', action: '\u21E5', description: 'Run a new backtest simulation' },
  { id: 'quick-strategy', label: 'New Strategy', path: '/strategy/lab', category: 'Actions', action: '\u21E5', description: 'Create a new trading strategy' },
  { id: 'quick-signal', label: 'Create Signal', path: '/markets/signals', category: 'Actions', action: '\u21E5', description: 'Define a new market signal' },
  { id: 'quick-trade', label: 'Place Trade', path: '/trading/live', category: 'Actions', action: '\u21E5', description: 'Open live trading wizard' },
  { id: 'quick-whatif', label: 'What-If Analysis', path: '/trading/what-if', category: 'Actions', action: '\u21E5', description: 'Scenario analysis for portfolio' },
  { id: 'quick-alert', label: 'Create Alert', path: '/alerts', category: 'Actions', action: '\u21E5', description: 'Set up price or signal alert' },
  { id: 'quick-screener', label: 'Run Screener', path: '/markets/screener', category: 'Actions', action: '\u21E5', description: 'Screen markets by criteria' },
]

const ALL_COMMANDS = [...NAV_COMMANDS, ...THEME_COMMANDS, ...ACTION_COMMANDS]

function formatShortcut(keys?: string): string {
  if (!keys) return ''
  return keys.replace('\u2318', MOD_KEY).replace('^', MOD_KEY)
}

export default function CommandPalette({ onThemeChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mode, setMode] = useState<'navigate' | 'action'>('navigate')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setMode('navigate')
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const recentIds = useMemo(() => open ? getRecentCommands() : [], [open])

  const commands = useMemo(() => {
    if (mode === 'action') return ACTION_COMMANDS
    if (query.startsWith('>')) {
      const actionQuery = query.slice(1).trim()
      const scored = ACTION_COMMANDS.map((cmd) => ({
        cmd, score: fuzzyScore(actionQuery, cmd.label),
      })).filter((s) => s.score > 0)
      scored.sort((a, b) => b.score - a.score)
      return scored.map((s) => s.cmd)
    }
    if (query.startsWith('theme ')) {
      const themeQuery = query.slice(6).trim()
      return THEME_COMMANDS.filter((c) => c.label.toLowerCase().includes(themeQuery))
    }
    return ALL_COMMANDS
  }, [query, mode])

  const filtered = useMemo(() => {
    if (!query.trim() || query.startsWith('>') || query.startsWith('theme ')) return commands
    if (mode === 'action') return ACTION_COMMANDS
    const scored = commands.map((cmd) => ({
      cmd,
      score: fuzzyScore(query, cmd.label) + fuzzyScore(query, cmd.category) * 0.5,
    })).filter((s) => s.score > 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.cmd)
  }, [query, commands, mode])

  const grouped = useMemo(() => {
    if (query.trim() && !query.startsWith('>') && !query.startsWith('theme ')) {
      return filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = []
        acc[cmd.category].push(cmd)
        return acc
      }, {})
    }
    const result: Record<string, Command[]> = {}
    if (!query.trim() && recentIds.length > 0) {
      result['Recent'] = recentIds.map((id) => ALL_COMMANDS.find((c) => c.id === id)).filter(Boolean) as Command[]
    }
    if (query.startsWith('>') || query.startsWith('theme ')) {
      result['Commands'] = filtered
      return result
    }
    const categories = [...new Set(ALL_COMMANDS.map((c) => c.category))]
    for (const cat of categories) {
      const items = ALL_COMMANDS.filter((c) => c.category === cat && !recentIds.includes(c.id))
      if (items.length > 0) result[cat] = items
    }
    return result
  }, [query, filtered, recentIds])

  const execute = useCallback((cmd: Command) => {
    setOpen(false)
    setQuery('')
    addRecentCommand(cmd.id)
    if (cmd.path.startsWith('__theme_')) {
      onThemeChange(cmd.path.replace('__theme_', '') as ThemeName)
    } else {
      navigate(cmd.path)
    }
  }, [navigate, onThemeChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      execute(filtered[selectedIdx])
    }
  }

  useEffect(() => {
    if (listRef.current && selectedIdx >= 0) {
      const el = listRef.current.children[selectedIdx] as HTMLElement
      el?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [selectedIdx])

  if (!open) return null

  const flatList = Object.values(grouped).flat()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full"
        style={{ maxWidth: 520, background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <span
            className="px-3"
            style={{
              color: 'var(--accent-green)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            {mode === 'action' ? '\u00BB' : '\u003E'}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIdx(0)
              if (e.target.value.startsWith('> ')) setMode('action')
              else setMode('navigate')
            }}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'action' ? 'type action...' : 'type command or page name...'}
            className="w-full bg-transparent outline-none"
            style={{
              color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              padding: '10px 10px',
              caretColor: 'var(--accent-green)',
            }}
          />
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={() => setMode(mode === 'action' ? 'navigate' : 'action')}
              className="text-[9px] px-1.5 py-0.5 cursor-pointer border-none"
              style={{
                background: mode === 'action' ? 'color-mix(in srgb, var(--accent-cyan) 20%, transparent)' : 'transparent',
                color: mode === 'action' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 3,
              }}
              title="Toggle action mode"
            >
              [A]
            </button>
          </div>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto" style={{ background: 'var(--bg-sidebar)' }}>
          {flatList.length === 0 && (
            <div className="p-3 text-center font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
              No results
            </div>
          )}
          {Object.entries(grouped).map(([category, cmds], groupIdx) => {
            const startIdx = Object.values(grouped).slice(0, groupIdx).flat().length
            return (
              <div key={category}>
                <div
                  className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {category}
                </div>
                {cmds.map((cmd, j) => {
                  const idx = startIdx + j
                  const isSelected = idx === selectedIdx
                  return (
                    <div
                      key={cmd.id}
                      className="flex items-center px-3 py-1.5 cursor-pointer"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        background: isSelected ? 'var(--bg-hover)' : 'transparent',
                        color: 'var(--text-primary)',
                        borderLeft: isSelected ? '2px solid var(--accent-green)' : '2px solid transparent',
                      }}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                    >
                      {cmd.action && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 9, marginRight: 6, width: 12, textAlign: 'center' }}>
                          {cmd.action}
                        </span>
                      )}
                      <div className="flex-1 flex flex-col">
                        <span>{cmd.label}</span>
                        {cmd.description && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 9, marginTop: 1 }}>{cmd.description}</span>
                        )}
                      </div>
                      {cmd.keys && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 8 }}>{formatShortcut(cmd.keys)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div
          className="flex items-center gap-3 px-3 py-1.5"
          style={{
            borderTop: '1px solid var(--border-color)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--text-muted)',
          }}
        >
          <span>\u2191\u2193 navigate</span>
          <span>\u23CE select</span>
          <span>esc close</span>
          <span> &gt; actions</span>
          <span>[A] toggle</span>
        </div>
      </div>
    </div>
  )
}

interface CommandPaletteProps {
  onThemeChange: (theme: ThemeName) => void
}
