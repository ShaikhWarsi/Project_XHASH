export interface RouteConfig {
  path: string
  label: string
  group: 'markets' | 'trading' | 'risk' | 'strategy' | 'ai' | 'research' | 'data' | 'settings'
  icon?: string
}

export const ROUTES: RouteConfig[] = [
  { path: '/', label: 'Hedge Fund', group: 'ai' },
  { path: '/markets/dashboard', label: 'Dashboard', group: 'markets' },

  // Markets
  { path: '/markets/chart', label: 'Chart', group: 'markets' },
  { path: '/markets/watchlist', label: 'Watchlist', group: 'markets' },
  { path: '/markets/signals', label: 'Signals', group: 'markets' },
  { path: '/markets/structure', label: 'Structure', group: 'markets' },
  { path: '/markets/advanced-charts', label: 'Advanced Charts', group: 'markets' },

  // Trading
  { path: '/trading/orders', label: 'Orders', group: 'trading' },
  { path: '/trading/trades', label: 'Trades', group: 'trading' },
  { path: '/trading/portfolio', label: 'Portfolio', group: 'trading' },
  { path: '/trading/paper-trading', label: 'Paper Trading', group: 'trading' },
  { path: '/trading/portfolio-optimization', label: 'Portfolio Opt', group: 'trading' },
  { path: '/trading/social-trading', label: 'Social Trading', group: 'trading' },
  { path: '/trading/live', label: 'Live Trading Wizard', group: 'trading' },

  // Risk
  { path: '/risk', label: 'Risk Dashboard', group: 'risk' },
  { path: '/risk/attribution', label: 'Attribution Analysis', group: 'risk' },

  // Strategy
  { path: '/strategy/backtest', label: 'Backtest', group: 'strategy' },
  { path: '/strategy/lab', label: 'Strategy Lab', group: 'strategy' },
  { path: '/strategy/code', label: 'Strategy Code', group: 'strategy' },
  { path: '/strategy/optimizer', label: 'Strategy Optimizer', group: 'strategy' },
  { path: '/strategy/visual', label: 'Visual Strategy', group: 'strategy' },

  // AI
  { path: '/ai/agents', label: 'Agents', group: 'ai' },
  { path: '/ai/hedge-fund', label: 'Hedge Fund', group: 'ai' },
  { path: '/ai/hedge-flow', label: 'Hedge Flow', group: 'ai' },
  { path: '/ai/swarm', label: 'Swarm', group: 'ai' },
  { path: '/ai/hypothesis-lab', label: 'Hypothesis Lab', group: 'ai' },
  { path: '/ai/debate', label: 'Debate Arena', group: 'ai' },
  { path: '/ai/rl-training', label: 'RL Training', group: 'ai' },
  { path: '/ai/llm', label: 'LLM Playground', group: 'ai' },
  { path: '/ai/persona-council', label: 'Persona Council', group: 'ai' },

  // Research
  { path: '/research/cfa', label: 'CFA Analytics', group: 'research' },
  { path: '/research/factor-analysis', label: 'Factor Analysis', group: 'research' },
  { path: '/research/factor-zoo', label: 'Factor Zoo', group: 'research' },
  { path: '/research/mmc', label: 'MMC Analysis', group: 'research' },
  { path: '/research/hyperopt', label: 'Hyperopt', group: 'research' },
  { path: '/research/geo', label: 'Geo Analysis', group: 'research' },
  { path: '/research/workflow-lab', label: 'Workflow Lab', group: 'research' },
  { path: '/research/sql', label: 'SQL Research', group: 'research' },
  { path: '/research/experiments', label: 'Experiment Lab', group: 'research' },

  // Data
  { path: '/data/pipeline', label: 'Data Pipeline', group: 'data' },
  { path: '/data/task-orchestration', label: 'Task Orchestration', group: 'data' },
  { path: '/data/signal-engines', label: 'Signal Engines', group: 'data' },
  { path: '/data/china-markets', label: 'China Markets', group: 'data' },
  { path: '/data/workflows', label: 'Workflows', group: 'data' },

  // Settings
  { path: '/settings', label: 'Settings', group: 'settings' },
  { path: '/settings/plugins', label: 'Plugins', group: 'settings' },
  { path: '/settings/infrastructure', label: 'Infrastructure', group: 'settings' },
  { path: '/settings/audit-log', label: 'Audit Log', group: 'settings' },
  { path: '/settings/bots', label: 'Bot Integrations', group: 'settings' },
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
