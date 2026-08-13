export interface GlossaryEntry {
  term: string
  definition: string
  category: string
  related?: string[]
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  'alpha': {
    term: 'Alpha',
    definition: 'The excess return of an investment relative to its benchmark. Positive alpha indicates outperformance.',
    category: 'Performance',
    related: ['beta', 'sharpe ratio', 'excess return'],
  },
  'beta': {
    term: 'Beta',
    definition: 'A measure of an asset\'s volatility relative to the market. Beta > 1 means higher volatility than the market.',
    category: 'Risk',
    related: ['alpha', 'volatility', 'correlation'],
  },
  'sharpe ratio': {
    term: 'Sharpe Ratio',
    definition: 'Risk-adjusted return measure calculated as (return - risk-free rate) / standard deviation. Higher is better.',
    category: 'Performance',
    related: ['alpha', 'sortino ratio', 'risk-free rate'],
  },
  'sortino ratio': {
    term: 'Sortino Ratio',
    definition: 'Similar to Sharpe but only considers downside volatility in the denominator. Better for asymmetric returns.',
    category: 'Performance',
    related: ['sharpe ratio', 'downside risk'],
  },
  'volatility': {
    term: 'Volatility',
    definition: 'Statistical measure of price dispersion, typically annualized standard deviation of returns. Higher = riskier.',
    category: 'Risk',
    related: ['beta', 'standard deviation', 'variance'],
  },
  'correlation': {
    term: 'Correlation',
    definition: 'Statistical measure (-1 to +1) of how two assets move together. +1 = perfect positive correlation.',
    category: 'Statistics',
    related: ['beta', 'covariance', 'diversification'],
  },
  'drawdown': {
    term: 'Drawdown',
    definition: 'The peak-to-trough decline in portfolio value. Maximum drawdown is the largest such decline.',
    category: 'Risk',
    related: ['max drawdown', 'recovery'],
  },
  'max drawdown': {
    term: 'Maximum Drawdown',
    definition: 'The largest observed loss from a peak to a trough in portfolio value, expressed as a percentage.',
    category: 'Risk',
    related: ['drawdown', 'recovery'],
  },
  'value at risk': {
    term: 'Value at Risk (VaR)',
    definition: 'The maximum expected loss over a given time period at a given confidence level (e.g., 95% VaR).',
    category: 'Risk',
    related: ['cvar', 'tail risk'],
  },
  'cvar': {
    term: 'Conditional VaR (CVaR)',
    definition: 'Expected loss beyond the VaR threshold. Also called Expected Shortfall. Captures tail risk better than VaR.',
    category: 'Risk',
    related: ['value at risk', 'tail risk'],
  },
  'standard deviation': {
    term: 'Standard Deviation',
    definition: 'A measure of the dispersion of returns from their mean. Square root of variance.',
    category: 'Statistics',
    related: ['variance', 'volatility'],
  },
  'rsi': {
    term: 'RSI (Relative Strength Index)',
    definition: 'Momentum oscillator measuring speed and change of price movements on a 0-100 scale. Overbought > 70, oversold < 30.',
    category: 'Technical Analysis',
    related: ['macd', 'stochastic', 'momentum'],
  },
  'macd': {
    term: 'MACD',
    definition: 'Moving Average Convergence Divergence. Trend-following indicator showing the relationship between two EMAs.',
    category: 'Technical Analysis',
    related: ['rsi', 'ema', 'signal line'],
  },
  'ema': {
    term: 'EMA (Exponential Moving Average)',
    definition: 'A weighted moving average that gives more weight to recent prices. More responsive than SMA.',
    category: 'Technical Analysis',
    related: ['sma', 'moving average'],
  },
  'sma': {
    term: 'SMA (Simple Moving Average)',
    definition: 'The arithmetic mean of prices over a specified number of periods. Equal weight to all observations.',
    category: 'Technical Analysis',
    related: ['ema', 'moving average'],
  },
  'bollinger bands': {
    term: 'Bollinger Bands',
    definition: 'Volatility bands placed above and below a moving average (typically 2 standard deviations apart).',
    category: 'Technical Analysis',
    related: ['standard deviation', 'sma', 'volatility'],
  },
  'fibonacci retracement': {
    term: 'Fibonacci Retracement',
    definition: 'Horizontal lines at key Fibonacci ratios (23.6%, 38.2%, 50%, 61.8%, 78.6%) indicating potential support/resistance.',
    category: 'Technical Analysis',
    related: ['support', 'resistance'],
  },
  'ichimoku': {
    term: 'Ichimoku Cloud',
    definition: 'Comprehensive indicator system showing support/resistance, trend direction, and momentum at a glance.',
    category: 'Technical Analysis',
    related: ['tenkan', 'kijun', 'senkou span'],
  },
  'backtesting': {
    term: 'Backtesting',
    definition: 'Evaluating a trading strategy on historical data to assess its viability before live deployment.',
    category: 'Strategy',
    related: ['forward testing', 'overfitting', 'walk-forward'],
  },
  'overfitting': {
    term: 'Overfitting',
    definition: 'Creating a model that performs well on historical data but fails on new data due to excessive complexity.',
    category: 'Strategy',
    related: ['backtesting', 'walk-forward', 'generalization'],
  },
  'walk forward': {
    term: 'Walk-Forward Analysis',
    definition: 'Robust validation method where a strategy is repeatedly optimized on in-sample data and tested on out-of-sample data.',
    category: 'Strategy',
    related: ['backtesting', 'overfitting'],
  },
  'monte carlo': {
    term: 'Monte Carlo Simulation',
    definition: 'A probabilistic technique using random sampling to model the probability of different outcomes in a process.',
    category: 'Statistics',
    related: ['simulation', 'probability'],
  },
}

export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.toLowerCase().trim()
  if (!q) return Object.values(GLOSSARY)
  return Object.values(GLOSSARY).filter(entry =>
    entry.term.toLowerCase().includes(q) ||
    entry.definition.toLowerCase().includes(q) ||
    entry.category.toLowerCase().includes(q)
  )
}

export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  return GLOSSARY[term.toLowerCase().trim()]
}
