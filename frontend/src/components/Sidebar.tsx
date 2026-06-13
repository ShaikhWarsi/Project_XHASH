import { useState, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, Activity, ScrollText, FlaskConical,
  CandlestickChart, Bot, Settings, Layers, Users, Workflow, Star,
  BarChart3, Sigma, X, ArrowLeftRight, FileCode,
  PieChart, TrendingUp, BrainCircuit, Code, GitBranch, Puzzle,
  Share2, Globe, Search, Cpu, ChevronDown, ChevronRight, Target,
  BarChart4, Radio, LineChart, Shield, Bell,
} from 'lucide-react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { ROUTES, GROUP_LABELS, type WorkflowGroup } from '../utils/routes'

const MOD = navigator.platform.startsWith('Mac') ? '⌘' : '^'

const ICON_MAP: Record<string, any> = {
  dashboard: LayoutDashboard, chart: CandlestickChart, watchlist: Star, alerts: Bell,
  signals: Activity, structure: Layers, 'advanced-charts': LineChart,
  orders: ArrowLeftRight, trades: ScrollText, portfolio: Wallet,
  'paper-trading': FlaskConical, 'portfolio-optimization': TrendingUp,
  'social-trading': Share2, risk: Shield, attribution: Target,
  backtest: BarChart3, lab: Code, code: FileCode, optimizer: FlaskConical,
  visual: Layers, agents: Bot, 'hedge-fund': Users,   'multi-agent-analysis': BrainCircuit,
  'hedge-flow': Workflow,
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
      .filter((r) => r.group === key && r.path !== '/markets/dashboard')
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

  const [workflowFilter, setWorkflowFilter] = useState<WorkflowGroup | null>(null)

  const filteredNavGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (!workflowFilter) return true
        const route = ROUTES.find((r) => r.path === item.to)
        return route?.workflow === workflowFilter
      }),
    })).filter((g) => !hiddenGroups[g.label] && g.items.length > 0)
  }, [workflowFilter, hiddenGroups])

  const WORKFLOW_OPTIONS: { id: WorkflowGroup; label: string; icon: any }[] = [
    { id: 'trader', label: 'Trader', icon: TrendingUp },
    { id: 'quant', label: 'Quant', icon: Sigma },
    { id: 'researcher', label: 'Research', icon: Search },
    { id: 'admin', label: 'Admin', icon: Settings },
  ]

  const sidebarContent = (
    <>
      <div className="flex items-center shrink-0 h-9 px-3 border-b border-default">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-bold text-up font-mono">TE$</span>
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="bg-transparent border-none text-secondary cursor-pointer p-0.5"
            aria-label="Close sidebar"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex gap-0.5 p-1 border-b border-default">
        <button onClick={() => setWorkflowFilter(null)} className="font-mono text-[9px] cursor-pointer" style={{
          flex: 1, padding: '3px 0',
          background: workflowFilter === null ? 'var(--accent-green)' : 'transparent',
          color: workflowFilter === null ? '#000' : 'var(--text-muted)',
          border: `1px solid ${workflowFilter === null ? 'var(--accent-green)' : 'var(--border-color)'}`,
          fontWeight: workflowFilter === null ? 700 : 400,
        }}>ALL</button>
        {WORKFLOW_OPTIONS.map((w) => {
          const Icon = w.icon
          const isActive = workflowFilter === w.id
          return (
            <button key={w.id} onClick={() => setWorkflowFilter(isActive ? null : w.id)} className="font-mono text-[9px] cursor-pointer flex items-center justify-center gap-0.5" style={{
              flex: 1, padding: '3px 0',
              background: isActive ? 'color-mix(in srgb, var(--accent-cyan) 20%, transparent)' : 'transparent',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
              fontWeight: isActive ? 700 : 400,
            }}>
              <Icon size={9} />
              {w.label}
            </button>
          )
        })}
      </div>
      <nav className="flex-1 py-2 overflow-y-auto [scrollbar-width:thin]" aria-label="Main navigation">
        {hiddenGroups['__all'] && (
          <div className="px-3 py-1">
            <button
              onClick={resetHidden}
              className="bg-transparent border border-default text-muted cursor-pointer text-[9px] px-2 py-0.5 w-full radius-sm"
            >
              RESET HIDDEN GROUPS
            </button>
          </div>
        )}
        {filteredNavGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.label]
          return (
            <div key={group.label} className="mb-3">
              <div
                className="flex items-center text-[9px] font-semibold uppercase tracking-widest px-3 py-1 cursor-pointer select-none text-muted"
                onClick={() => toggleGroup(group.label)}
              >
                {isCollapsed ? <ChevronRight size={10} className="mr-1" /> : <ChevronDown size={10} className="mr-1" />}
                <span className="flex-1">{group.label}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); toggleHidden(group.label) }}
                  title="Hide group"
                  className="opacity-40 cursor-pointer text-[10px] px-1"
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
                      className="flex items-center text-[11px] font-mono no-underline"
                      style={({ isActive }) => ({
                        padding: '4px 12px',
                        color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--bg-hover)' : 'transparent',
                        borderLeft: isActive ? '2px solid var(--accent-green)' : '2px solid transparent',
                      })}
                      aria-label={link.label}
                    >
                      <link.icon className="w-3.5 h-3.5 shrink-0 mr-2 opacity-70" />
                      <span className="flex-1">{link.label}</span>
                      {link.badge && (
                        <span className="text-[8px] bg-accent-blue text-white px-1 leading-[14px] mr-1 radius-md">
                          {link.badge}
                        </span>
                      )}
                      {link.shortcut && (
                        <span className="text-muted text-[9px] opacity-50">
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
      <div className="text-[9px] px-3 py-2 shrink-0 border-t border-default text-muted font-mono">
        <div className="opacity-50">{`\u2318K`} palette</div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[var(--z-overlay)]"
          />
        )}
        <aside
          className="fixed top-0 left-0 bottom-0 z-[var(--z-sidebar)] flex flex-col bg-sidebar border-r border-default"
          style={{
            width: 200,
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
      className="flex flex-col shrink-0 w-[var(--sidebar-width)] bg-sidebar border-r border-default"
    >
      {sidebarContent}
    </aside>
  )
}
