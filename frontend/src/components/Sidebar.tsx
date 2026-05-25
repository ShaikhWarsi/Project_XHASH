import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, Activity, ScrollText, FlaskConical,
  CandlestickChart, Bot, Settings, Layers, Users, Workflow, Star,
  BarChart3, Sigma, X, ArrowLeftRight, FileCode, AlertTriangle,
  PieChart, TrendingUp, BrainCircuit, Code, GitBranch, Puzzle,
  Share2, Globe, Search, Cpu, ChevronDown, ChevronRight, Target,
  BarChart4, Radio, LineChart, Shield, BookOpen, Database,
} from 'lucide-react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { ROUTES, GROUP_LABELS, type RouteConfig } from '../utils/routes'

const MOD = navigator.platform.startsWith('Mac') ? '⌘' : '^'

const ICON_MAP: Record<string, any> = {
  dashboard: LayoutDashboard, chart: CandlestickChart, watchlist: Star,
  signals: Activity, structure: Layers, 'advanced-charts': LineChart,
  orders: ArrowLeftRight, trades: ScrollText, portfolio: Wallet,
  'paper-trading': FlaskConical, 'portfolio-optimization': TrendingUp,
  'social-trading': Share2, risk: Shield, attribution: Target,
  backtest: BarChart3, lab: Code, code: FileCode, optimizer: FlaskConical,
  visual: Layers, agents: Bot, 'hedge-fund': Users, 'hedge-flow': Workflow,
  swarm: Activity, 'hypothesis-lab': FlaskConical, debate: Users,
  'rl-training': BrainCircuit, llm: BrainCircuit,
  cfa: PieChart, 'factor-analysis': Sigma, 'factor-zoo': Search,
  mmc: GitBranch, hyperopt: BarChart4, geo: Globe, 'workflow-lab': GitBranch,
  pipeline: GitBranch, 'task-orchestration': Workflow,
  'signal-engines': Radio, 'china-markets': TrendingUp,
  workflows: Workflow, settings: Settings, plugins: Puzzle,
  infrastructure: Cpu, 'audit-log': ScrollText, bots: Share2,
}

function getIcon(path: string): any {
  const last = path.split('/').pop() || 'dashboard'
  return ICON_MAP[last] || LayoutDashboard
}

type NavGroup = {
  label: string
  items: { to: string; label: string; icon: any; shortcut?: string; badge?: string }[]
}

function buildNavGroups(): NavGroup[] {
  const groupKeys = ['markets', 'trading', 'risk', 'strategy', 'ai', 'research', 'data', 'settings']
  const shortcutMap: Record<string, string> = {
    '/': `${MOD}1`, '/markets/chart': `${MOD}2`, '/markets/watchlist': `${MOD}3`,
    '/markets/signals': `${MOD}4`, '/trading/orders': `${MOD}5`, '/trading/portfolio': `${MOD}6`,
    '/risk': `${MOD}7`, '/ai/agents': `${MOD}8`,
  }
  return groupKeys.map((key) => ({
    label: GROUP_LABELS[key] || key.toUpperCase(),
    items: ROUTES
      .filter((r) => r.group === key)
      .map((r) => ({
        to: r.path,
        label: r.label,
        icon: getIcon(r.path),
        shortcut: shortcutMap[r.path],
      })),
  }))
}

const NAV_GROUPS: NavGroup[] = buildNavGroups()

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isMobile } = useBreakpoint()
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [hiddenGroups, setHiddenGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebar_hidden_groups') || '{}')
    } catch { return {} }
  })

  const toggleHidden = (label: string) => {
    setHiddenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      localStorage.setItem('sidebar_hidden_groups', JSON.stringify(next))
      return next
    })
  }

  const resetHidden = () => {
    setHiddenGroups({})
    localStorage.removeItem('sidebar_hidden_groups')
  }

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const sidebarContent = (
    <>
      <div
        className="flex items-center shrink-0"
        style={{
          height: 36,
          padding: '0 12px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2 flex-1">
          <span
            className="text-xs font-bold"
            style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            TE$
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>v0.3</span>
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2 }}
            aria-label="Close sidebar"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <nav className="flex-1 py-2 overflow-y-auto" aria-label="Main navigation" style={{ scrollbarWidth: 'thin' }}>
        {hiddenGroups['__all'] && (
          <div style={{ padding: '4px 12px' }}>
            <button
              onClick={resetHidden}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 9,
                padding: '2px 8px',
                width: '100%',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              RESET HIDDEN GROUPS
            </button>
          </div>
        )}
        {NAV_GROUPS.filter((g) => !hiddenGroups[g.label]).map((group) => {
          const isCollapsed = collapsedGroups[group.label]
          return (
            <div key={group.label} className="mb-3">
              <div
                className="flex items-center text-[9px] font-semibold uppercase tracking-widest px-3 py-1 cursor-pointer select-none"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => toggleGroup(group.label)}
              >
                {isCollapsed ? <ChevronRight size={10} style={{ marginRight: 4 }} /> : <ChevronDown size={10} style={{ marginRight: 4 }} />}
                <span style={{ flex: 1 }}>{group.label}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); toggleHidden(group.label) }}
                  title="Hide group"
                  style={{ opacity: 0.4, cursor: 'pointer', fontSize: 10, padding: '0 4px' }}
                >
                  ✕
                </span>
              </div>
              {!isCollapsed && (
                <div>
                  {group.items.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/'}
                      onClick={isMobile ? onClose : undefined}
                      className="flex items-center"
                      style={({ isActive }) => ({
                        padding: '4px 12px',
                        fontSize: 11,
                        textDecoration: 'none',
                        color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--bg-hover)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--accent-green)' : '2px solid transparent',
                        transition: 'none',
                        fontFamily: "'JetBrains Mono', monospace",
                      })}
                      aria-label={link.label}
                    >
                      <link.icon className="w-3.5 h-3.5 shrink-0" style={{ marginRight: 8, opacity: 0.7 }} />
                      <span className="flex-1">{link.label}</span>
                      {link.badge && (
                        <span
                          style={{
                            fontSize: 8,
                            background: 'var(--accent-blue)',
                            color: '#fff',
                            padding: '0 4px',
                            borderRadius: 4,
                            lineHeight: '14px',
                            marginRight: 4,
                          }}
                        >
                          {link.badge}
                        </span>
                      )}
                      {link.shortcut && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 9, opacity: 0.5 }}>
                          {link.shortcut}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div
        className="text-[9px] px-3 py-2 shrink-0"
        style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}
      >
        <div style={{ opacity: 0.5 }}>{`⌘K`} palette</div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 'var(--z-overlay)',
            }}
          />
        )}
        <aside
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 'var(--sidebar-width)',
            background: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)',
            zIndex: 'var(--z-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.2s ease',
          }}
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {sidebarContent}
    </aside>
  )
}
