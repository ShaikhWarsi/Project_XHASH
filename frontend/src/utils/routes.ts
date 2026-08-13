export type RouteGroup = 'markets' | 'trading' | 'risk' | 'strategy' | 'ai' | 'research' | 'data' | 'settings' | 'admin'
export type WorkflowGroup = 'trader' | 'quant' | 'researcher' | 'admin'
export type WorkspaceId = 'markets' | 'strategy' | 'ai' | 'risk' | 'admin'

export interface RouteConfig {
  path: string
  label: string
  group: RouteGroup
  workflow?: WorkflowGroup
  icon?: string
}

export interface WorkspaceSubtab {
  path: string
  label: string
  shortLabel?: string
  icon?: string
}

export interface WorkspaceConfig {
  id: WorkspaceId
  label: string
  shortLabel: string
  badge?: string
  defaultPath: string
  subtabs: WorkspaceSubtab[]
}

export const WORKSPACES: WorkspaceConfig[] = [
  {
    id: 'markets',
    label: 'Markets & Execution',
    shortLabel: 'MARKETS',
    defaultPath: '/',
    subtabs: [
      { path: '/', label: 'Dashboard', shortLabel: 'Dash' },
      { path: '/markets/chart', label: 'Interactive Chart', shortLabel: 'Chart' },
      { path: '/markets/watchlist', label: 'Watchlist', shortLabel: 'Watchlist' },
      { path: '/markets/signals', label: 'Live Signals', shortLabel: 'Signals' },
      { path: '/markets/structure', label: 'Market Structure', shortLabel: 'Structure' },
      { path: '/trading/orders', label: 'Order Book & Fills', shortLabel: 'Orders' },
      { path: '/trading/portfolio', label: 'Portfolio & PnL', shortLabel: 'Portfolio' },
      { path: '/trading/paper-trading', label: 'Paper Trading', shortLabel: 'Paper' },
      { path: '/trading/live', label: 'Live Broker Wizard', shortLabel: 'Live' },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy & Quant Studio',
    shortLabel: 'STRATEGY',
    defaultPath: '/strategy/backtest',
    subtabs: [
      { path: '/strategy/backtest', label: 'Backtesting Engine', shortLabel: 'Backtest' },
      { path: '/strategy/lab', label: 'Strategy Lab', shortLabel: 'Lab' },
      { path: '/strategy/visual', label: 'Visual Flow Builder', shortLabel: 'Visual Flow' },
      { path: '/strategy/code', label: 'Code & FinScript', shortLabel: 'Code' },
      { path: '/strategy/optimizer', label: 'Strategy Optimizer', shortLabel: 'Optimizer' },
      { path: '/research/factor-zoo', label: 'Factor Zoo', shortLabel: 'Factors' },
      { path: '/research/cfa', label: 'CFA Financial Analytics', shortLabel: 'CFA' },
      { path: '/research/hyperopt', label: 'Hyperopt Search', shortLabel: 'Hyperopt' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Multi-Agent Chamber',
    shortLabel: 'AI COUNCIL',
    defaultPath: '/ai/persona-council',
    subtabs: [
      { path: '/ai/persona-council', label: 'Persona Council (Buffett/Simons/Dalio)', shortLabel: 'Council' },
      { path: '/ai/agents', label: 'Autonomous Agents', shortLabel: 'Agents' },
      { path: '/ai/strategy-generator', label: 'AI Strategy Generator', shortLabel: 'AI Builder' },
      { path: '/ai/multi-agent-analysis', label: 'Multi-Agent Debate', shortLabel: 'Debate' },
      { path: '/ai/llm', label: 'Prompt-to-Trade & LLM', shortLabel: 'Prompt Trade' },
      { path: '/ai/risk-report', label: 'AI Risk Intelligence', shortLabel: 'Risk Report' },
      { path: '/ai/explain-stops', label: 'Explainable Stops', shortLabel: 'Explain Stops' },
    ],
  },
  {
    id: 'risk',
    label: 'Risk & Portfolio Command',
    shortLabel: 'RISK & PORTFOLIO',
    defaultPath: '/risk',
    subtabs: [
      { path: '/risk', label: 'Risk Dashboard & Limits', shortLabel: 'Risk Dash' },
      { path: '/trading/portfolio-optimization', label: 'Markowitz / Black-Litterman / HRP', shortLabel: 'Optimization' },
      { path: '/risk/attribution', label: 'Attribution Analysis', shortLabel: 'Attribution' },
      { path: '/trading/what-if', label: 'What-If Simulation', shortLabel: 'What-If' },
      { path: '/research/factor-analysis', label: 'Factor Attribution', shortLabel: 'Factor Analysis' },
    ],
  },
  {
    id: 'admin',
    label: 'System & Admin Hub',
    shortLabel: 'SYSTEM',
    defaultPath: '/settings',
    subtabs: [
      { path: '/settings', label: 'Platform Settings', shortLabel: 'Settings' },
      { path: '/openalgo/apikey', label: 'Broker & API Keys', shortLabel: 'API Keys' },
      { path: '/settings/bots', label: 'Telegram & WhatsApp Bots', shortLabel: 'Bots' },
      { path: '/openalgo/webhook-bridges', label: 'TradingView Webhooks', shortLabel: 'Webhooks' },
      { path: '/openalgo/health', label: 'Health & Diagnostics', shortLabel: 'Health' },
      { path: '/openalgo/latency', label: 'Latency Monitor', shortLabel: 'Latency' },
      { path: '/settings/infrastructure', label: 'Infrastructure & DB', shortLabel: 'Infra' },
      { path: '/settings/audit-log', label: 'Audit Log', shortLabel: 'Audit' },
    ],
  },
]

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
  { path: '/markets/options', label: 'Options Chain', group: 'markets', workflow: 'trader' },
  { path: '/markets/calendar', label: 'Calendar', group: 'markets', workflow: 'trader' },
  { path: '/markets/market-intel', label: 'Market Intel', group: 'markets', workflow: 'trader' },

  // Trading
  { path: '/trading/orders', label: 'Orders', group: 'trading', workflow: 'trader' },
  { path: '/trading/trades', label: 'Trades', group: 'trading', workflow: 'trader' },
  { path: '/trading/portfolio', label: 'Portfolio', group: 'trading', workflow: 'trader' },
  { path: '/trading/paper-trading', label: 'Paper Trading', group: 'trading', workflow: 'trader' },
  { path: '/trading/portfolio-optimization', label: 'Portfolio Opt', group: 'trading', workflow: 'quant' },
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
  { path: '/ai/hedge-flow', label: 'Hedge Flow', group: 'ai', workflow: 'quant' },
  { path: '/ai/hypothesis-lab', label: 'Hypothesis Lab', group: 'ai', workflow: 'researcher' },
  { path: '/ai/rl-training', label: 'RL Training', group: 'ai', workflow: 'quant' },
  { path: '/ai/llm', label: 'LLM Playground', group: 'ai', workflow: 'researcher' },
  { path: '/ai/persona-council', label: 'Persona Council', group: 'ai', workflow: 'quant' },
  { path: '/ai/strategy-generator', label: 'Strategy Generator', group: 'ai', workflow: 'quant' },
  { path: '/ai/prompt-library', label: 'Prompt Library', group: 'ai', workflow: 'researcher' },
  { path: '/ai/explain-stops', label: 'Explain Stops', group: 'ai', workflow: 'trader' },
  { path: '/ai/risk-report', label: 'Risk Report', group: 'ai', workflow: 'trader' },
  { path: '/ai/multi-agent-analysis', label: 'Multi-Agent Analysis', group: 'ai', workflow: 'quant' },

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

  // Settings
  { path: '/settings', label: 'Settings', group: 'settings', workflow: 'admin' },
  { path: '/settings/plugins', label: 'Plugins', group: 'settings', workflow: 'admin' },
  { path: '/settings/infrastructure', label: 'Infrastructure', group: 'settings', workflow: 'admin' },
  { path: '/settings/audit-log', label: 'Audit Log', group: 'settings', workflow: 'admin' },
  { path: '/settings/bots', label: 'Bot Integrations', group: 'settings', workflow: 'admin' },

  // Admin / OpenAlgo
  { path: '/openalgo/apikey', label: 'API Keys', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/latency', label: 'Latency', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/traffic', label: 'Traffic', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/pnl', label: 'P&L Tracker', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/action-center', label: 'Action Center', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/health', label: 'Health', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/master-contract', label: 'Master Contract', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/master-contract/view', label: 'Master Contract View', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/sandbox', label: 'Sandbox', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/analyzer', label: 'Analyzer', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/security', label: 'Security', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/security-admin', label: 'Security Admin', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/gtt', label: 'GTT Orders', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/python-strategy', label: 'Python Strategy', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/flow', label: 'Flow Builder', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/ws-proxy', label: 'WebSocket Proxy', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/telegram-bot', label: 'Telegram Bot', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/mcp-oauth', label: 'MCP OAuth', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/webhook-bridges', label: 'Webhook Bridges', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/chartink', label: 'ChartInk', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/historify', label: 'Historify', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/playground', label: 'API Playground', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/multiquotes', label: 'Multi Quotes', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/market-timings', label: 'Market Timings', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/market-holidays', label: 'Market Holidays', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/whatsapp', label: 'WhatsApp Bot', group: 'admin', workflow: 'admin' },
  { path: '/openalgo/strategy-portfolio', label: 'Strategy Portfolio', group: 'admin', workflow: 'admin' },
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

export function getActiveWorkspace(currentPath: string): WorkspaceConfig {
  for (const ws of WORKSPACES) {
    if (ws.subtabs.some((s) => s.path === currentPath)) {
      return ws
    }
  }

  if (currentPath.startsWith('/strategy') || currentPath.startsWith('/research')) {
    return WORKSPACES.find((w) => w.id === 'strategy') || WORKSPACES[0]
  }
  if (currentPath.startsWith('/ai')) {
    return WORKSPACES.find((w) => w.id === 'ai') || WORKSPACES[0]
  }
  if (currentPath.startsWith('/risk') || currentPath.startsWith('/trading/portfolio-optimization') || currentPath.startsWith('/trading/what-if')) {
    return WORKSPACES.find((w) => w.id === 'risk') || WORKSPACES[0]
  }
  if (currentPath.startsWith('/settings') || currentPath.startsWith('/openalgo')) {
    return WORKSPACES.find((w) => w.id === 'admin') || WORKSPACES[0]
  }

  return WORKSPACES[0]
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
  admin: 'ADMIN',
}
