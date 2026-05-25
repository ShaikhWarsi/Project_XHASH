import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ThemeName } from '../contexts/ThemeContext'
import { ROUTES, GROUP_LABELS } from '../utils/routes'

const MOD_KEY = navigator.platform.startsWith('Mac') ? '⌘' : '^'
const RECENT_KEY = 'cmd_palette_recent'
const MAX_RECENT = 5

interface Command {
  id: string
  label: string
  path: string
  keys?: string
  category: string
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
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch { return [] }
}

function addRecentCommand(id: string) {
  const recent = getRecentCommands().filter((r) => r !== id)
  recent.unshift(id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

const SHORTCUT_MAP: Record<string, string> = {
  '/': `${MOD_KEY}1`,
  '/markets/chart': `${MOD_KEY}2`,
  '/markets/watchlist': `${MOD_KEY}3`,
  '/markets/signals': `${MOD_KEY}4`,
  '/trading/orders': `${MOD_KEY}5`,
  '/trading/portfolio': `${MOD_KEY}6`,
  '/risk': `${MOD_KEY}7`,
  '/ai/agents': `${MOD_KEY}8`,
  '/strategy/backtest': `${MOD_KEY}9`,
  '/ai/llm': `${MOD_KEY}0`,
  '/trading/trades': `${MOD_KEY}T`,
  '/settings': `${MOD_KEY}O`,
}

const NAV_COMMANDS: Command[] = ROUTES.map((r) => ({
  id: r.path,
  label: r.label,
  path: r.path,
  keys: SHORTCUT_MAP[r.path],
  category: GROUP_LABELS[r.group] || r.group.toUpperCase(),
}))

const THEME_COMMANDS: Command[] = [
  { id: 'theme-classic', label: 'Switch Theme: Classic', path: '__theme_classic', category: 'Theme' },
  { id: 'theme-matrix', label: 'Switch Theme: Matrix', path: '__theme_matrix', category: 'Theme' },
  { id: 'theme-amber', label: 'Switch Theme: Amber', path: '__theme_amber', category: 'Theme' },
  { id: 'theme-cyber', label: 'Switch Theme: Cyber', path: '__theme_cyber', category: 'Theme' },
  { id: 'theme-terminal', label: 'Switch Theme: Terminal', path: '__theme_terminal', category: 'Theme' },
  { id: 'theme-light', label: 'Switch Theme: Light', path: '__theme_light', category: 'Theme' },
]

const ALL_COMMANDS = [...NAV_COMMANDS, ...THEME_COMMANDS]

interface CommandPaletteProps {
  onThemeChange: (theme: ThemeName) => void
}

function formatShortcut(keys?: string): string {
  if (!keys) return ''
  return keys.replace('⌘', MOD_KEY).replace('^', MOD_KEY)
}

export default function CommandPalette({ onThemeChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
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

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS
    const scored = ALL_COMMANDS.map((cmd) => ({
      cmd,
      score: fuzzyScore(query, cmd.label) + fuzzyScore(query, cmd.category) * 0.5,
    })).filter((s) => s.score > 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.cmd)
  }, [query])

  const grouped = useMemo(() => {
    if (query.trim()) {
      return filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = []
        acc[cmd.category].push(cmd)
        return acc
      }, {})
    }
    const result: Record<string, Command[]> = {}
    if (recentIds.length > 0) {
      result['Recent'] = recentIds
        .map((id) => ALL_COMMANDS.find((c) => c.id === id))
        .filter(Boolean) as Command[]
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
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
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
        style={{
          maxWidth: 480,
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
        }}
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
            {'>'}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="type command..."
            className="w-full bg-transparent outline-none"
            style={{
              color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              padding: '10px 10px',
              caretColor: 'var(--accent-green)',
            }}
          />
        </div>
        <div ref={listRef} className="max-h-72 overflow-y-auto" style={{ background: 'var(--bg-sidebar)' }}>
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
                    style={{
                      color: 'var(--text-muted)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
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
                        <span className="flex-1">{cmd.label}</span>
                        {cmd.keys && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{formatShortcut(cmd.keys)}</span>
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
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
