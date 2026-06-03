export type RouteGroup = 'markets' | 'trading' | 'risk' | 'strategy' | 'ai' | 'research' | 'data' | 'settings'
export type WorkflowGroup = 'trader' | 'quant' | 'researcher' | 'admin'

export interface RouteConfig {
  path: string
  label: string
  group: RouteGroup
  workflow?: WorkflowGroup
  icon?: string
}

export const ROUTES: RouteConfig[] = [
  { path: '/', label: 'Dashboard', group: 'markets', workflow: 'trader' },
  { path: '/markets/dashboard', label: 'Dashboard', group: 'markets', workflow: 'trader' },
  { path: '/alerts', label: 'Alerts', group: 'markets', workflow: 'trader' },

  // Markets
  { path: '/markets/chart', label: 'Chart', group: 'markets', workflow: 'trader' },
  { path: '/markets/watchlist', label: 'Watchlist', group: 'markets', workflow: 'trader' },
  { path: '/markets/signals', label: 'Signals', group: 'markets', workflow: 'quant' },
  { path: '/markets/structure', label: 'Structure', group: 'markets', workflow: 'quant' },
  { path: '/markets/advanced-charts', label: 'Advanced Charts', group: 'markets', workflow: 'trader' },
  { path: '/markets/screener', label: 'Screener', group: 'markets', workflow: 'researcher' },
  { path: '/markets/compare', label: 'Compare', group: 'markets', workflow: 'quant' },
  { path: '/markets/persona-council', label: 'Persona Council', group: 'markets', workflow: 'quant' },
  { path: '/markets/options', label: 'Options Chain', group: 'markets', workflow: 'trader' },
  { path: '/markets/calendar', label: 'Calendar', group: 'markets', workflow: 'trader' },

  // Trading
  { path: '/trading/orders', label: 'Orders', group: 'trading', workflow: 'trader' },
  { path: '/trading/trades', label: 'Trades', group: 'trading', workflow: 'trader' },
  { path: '/trading/portfolio', label: 'Portfolio', group: 'trading', workflow: 'trader' },
  { path: '/trading/paper-trading', label: 'Paper Trading', group: 'trading', workflow: 'trader' },
  { path: '/trading/portfolio-optimization', label: 'Portfolio Opt', group: 'trading', workflow: 'quant' },
  { path: '/trading/social-trading', label: 'Social Trading', group: 'trading', workflow: 'trader' },
  { path: '/trading/live', label: 'Live Trading Wizard', group: 'trading', workflow: 'trader' },
  { path: '/trading/what-if', label: 'What-If', group: 'trading', workflow: 'quant' },

  // Risk
  { path: '/risk', label: 'Risk Dashboard', group: 'risk', workflow: 'trader' },
  { path: '/risk/attribution', label: 'Attribution Analysis', group: 'risk', workflow: 'quant' },

  // Strategy
  { path: '/strategy/backtest', label: 'Backtest', group: 'strategy', workflow: 'quant' },
  { path: '/strategy/lab', label: 'Strategy Lab', group: 'strategy', workflow: 'quant' },
  { path: '/strategy/code', label: 'Strategy Code', group: 'strategy', workflow: 'quant' },
  { path: '/strategy/optimizer', label: 'Strategy Optimizer', group: 'strategy', workflow: 'quant' },
  { path: '/strategy/visual', label: 'Visual Strategy', group: 'strategy', workflow: 'quant' },

  // AI
  { path: '/ai/agents', label: 'Agents', group: 'ai', workflow: 'quant' },
  { path: '/ai/hedge-fund', label: 'Hedge Fund', group: 'ai', workflow: 'quant' },
  { path: '/ai/hedge-flow', label: 'Hedge Flow', group: 'ai', workflow: 'quant' },
  { path: '/ai/swarm', label: 'Swarm', group: 'ai', workflow: 'quant' },
  { path: '/ai/hypothesis-lab', label: 'Hypothesis Lab', group: 'ai', workflow: 'researcher' },
  { path: '/ai/debate', label: 'Debate Arena', group: 'ai', workflow: 'researcher' },
  { path: '/ai/rl-training', label: 'RL Training', group: 'ai', workflow: 'quant' },
  { path: '/ai/llm', label: 'LLM Playground', group: 'ai', workflow: 'researcher' },
  { path: '/ai/persona-council', label: 'Persona Council', group: 'ai', workflow: 'quant' },

  // Research
  { path: '/research/cfa', label: 'CFA Analytics', group: 'research', workflow: 'researcher' },
  { path: '/research/factor-analysis', label: 'Factor Analysis', group: 'research', workflow: 'researcher' },
  { path: '/research/factor-zoo', label: 'Factor Zoo', group: 'research', workflow: 'researcher' },
  { path: '/research/mmc', label: 'MMC Analysis', group: 'research', workflow: 'researcher' },
  { path: '/research/hyperopt', label: 'Hyperopt', group: 'research', workflow: 'researcher' },
  { path: '/research/geo', label: 'Geo Analysis', group: 'research', workflow: 'researcher' },
  { path: '/research/workflow-lab', label: 'Workflow Lab', group: 'research', workflow: 'researcher' },
  { path: '/research/sql', label: 'SQL Research', group: 'research', workflow: 'researcher' },
  { path: '/research/experiments', label: 'Experiment Lab', group: 'research', workflow: 'researcher' },

  // Data
  { path: '/data/pipeline', label: 'Data Pipeline', group: 'data', workflow: 'quant' },
  { path: '/data/task-orchestration', label: 'Task Orchestration', group: 'data', workflow: 'quant' },
  { path: '/data/signal-engines', label: 'Signal Engines', group: 'data', workflow: 'quant' },
  { path: '/data/china-markets', label: 'China Markets', group: 'data', workflow: 'researcher' },
  { path: '/data/workflows', label: 'Workflows', group: 'data', workflow: 'quant' },
  { path: '/data/signals-stream', label: 'Signals Stream', group: 'data', workflow: 'quant' },

  // Settings
  { path: '/settings', label: 'Settings', group: 'settings', workflow: 'admin' },
  { path: '/settings/plugins', label: 'Plugins', group: 'settings', workflow: 'admin' },
  { path: '/settings/infrastructure', label: 'Infrastructure', group: 'settings', workflow: 'admin' },
  { path: '/settings/audit-log', label: 'Audit Log', group: 'settings', workflow: 'admin' },
  { path: '/settings/bots', label: 'Bot Integrations', group: 'settings', workflow: 'admin' },
]

export function getRouteLabel(path: string): string {
  const route = ROUTES.find((r) => r.path === path)
  if (route) return route.label
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1]?.replace(/-/g, ' ') || 'Dashboard'
}

export function getRouteGroup(path: string): string {
  const route = ROUTES.find((r) => r.path === path)
  if (route) return route.group
  return ''
}

export const GROUP_LABELS: Record<string, string> = {
  markets: 'MARKETS',
  trading: 'TRADING',
  risk: 'RISK',
  strategy: 'STRATEGY',
  ai: 'AI & STRATEGIES',
  research: 'RESEARCH',
  data: 'DATA',
  settings: 'SETTINGS',
}
