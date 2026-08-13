export interface TourStep {
  id: string
  title: string
  description: string
  target?: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export interface Tour {
  id: string
  name: string
  description: string
  steps: TourStep[]
}

export const DEFAULT_TOURS: Tour[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Quick tour of the main features',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to X_KA_HASH',
        description: 'Your algorithmic trading platform. Let us walk you through the key features.',
        position: 'center',
      },
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Monitor your portfolio performance, account value, and recent orders at a glance.',
        target: '[data-tour="dashboard"]',
        position: 'bottom',
      },
      {
        id: 'chart',
        title: 'Chart',
        description: 'Advanced charting with 21+ drawing tools, 20+ indicators, and multiple timeframe support.',
        target: '[data-tour="chart"]',
        position: 'bottom',
      },
      {
        id: 'portfolio',
        title: 'Portfolio',
        description: 'Track your positions, P&L, and exposure across all instruments.',
        target: '[data-tour="portfolio"]',
        position: 'top',
      },
      {
        id: 'trading',
        title: 'Trading',
        description: 'Execute trades with smart order routing. Use paper trading to practice risk-free.',
        target: '[data-tour="trading"]',
        position: 'left',
      },
      {
        id: 'signals',
        title: 'Signals & Alerts',
        description: 'Set up automated signals based on technical indicators and receive real-time alerts.',
        target: '[data-tour="signals"]',
        position: 'right',
      },
      {
        id: 'backtest',
        title: 'Backtesting',
        description: 'Test your strategies against historical data before going live.',
        target: '[data-tour="backtest"]',
        position: 'top',
      },
    ],
  },
]
