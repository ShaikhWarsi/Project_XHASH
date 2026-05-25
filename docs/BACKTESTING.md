# Backtesting Engine

The Trading Engine includes a comprehensive event-driven backtesting system with support for multiple asset classes, Monte Carlo simulations, walk-forward analysis, and scenario testing.

## Overview

Located in [backtesting/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\) directory.

```
┌─────────────────────────────────────────────────────────────┐
│                    BacktestEngine                             │
├─────────────────────────────────────────────────────────────┤
│  - Event-driven simulation                                   │
│  - Commission & slippage modeling                           │
│  - Multi-asset support                                       │
│  - Real-time metrics calculation                            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Market-Specific Engines                         │
├──────────┬──────────┬───────────┬─────────┬────────────────┤
│ Global   │ China A  │ China     │ Forex   │ Crypto         │
│ Equity   │          │ Futures   │         │                │
└──────────┴──────────┴───────────┴─────────┴────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│            Advanced Features                                  │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Monte Carlo  │ Walk-Forward │  Scenarios  │ Synthetic Data │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

## Quick Start

```python
from backtesting.engine import BacktestEngine

engine = BacktestEngine(
    initial_capital=1_000_000,
    commission=0.001,    # 0.1% commission
    slippage=0.001       # 0.1% slippage
)

results = engine.run(
    tickers=["AAPL", "MSFT"],
    start="2020-01-01",
    end="2024-01-01",
    strategy=my_strategy
)

print(f"Sharpe: {results.sharpe_ratio}")
print(f"Max DD: {results.max_drawdown}")
```

## Market Engines

Located in [backtesting/market_engines/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\)

### Global Equity

```python
from backtesting.market_engines.global_equity import GlobalEquityEngine

engine = GlobalEquityEngine()
```

Supports: US, European stocks with dividend adjustments, splits handling.

### China A-Share

```python
from backtesting.market_engines.china_a import ChinaAEngine

engine = ChinaAEngine()
```

Supports: SSE, SZSE with T+1 trading rules, price limits.

### China Futures

```python
from backtesting.market_engines.china_futures import ChinaFuturesEngine

engine = ChinaFuturesEngine()
```

Supports: CFFEX contracts with delivery month rollovers.

### Forex

```python
from backtesting.market_engines.forex import ForexEngine

engine = ForexEngine()
```

Supports: Major, minor, exotic pairs with pip-based sizing.

### Crypto

```python
from backtesting.market_engines.crypto import CryptoEngine

engine = CryptoEngine()
```

Supports: BTC, ETH, altcoins with 24/7 trading.

### Global Futures

```python
from backtesting.market_engines.global_futures import GlobalFuturesEngine

engine = GlobalFuturesEngine()
```

Supports: CME, ICE commodities, financial futures.

## Monte Carlo Simulation

Located in [backtesting/monte_carlo.py](../../backtesting/monte_carlo.py)

Run 1000+ equity curve scenarios:

```python
from backtesting.monte_carlo import MonteCarloSimulator

simulator = MonteCarloSimulator(
    n_simulations=1000,
    bootstrap_method="block",  # block bootstrap preserves autocorrelation
    block_size=20
)

results = simulator.run(backtest_results)

# Get confidence intervals
print(f"Sharpe 5%:  {results.sharpe_percentile(5)}")
print(f"Sharpe 50%: {results.sharpe_percentile(50)}")
print(f"Sharpe 95%: {results.sharpe_percentile(95)}")

# Worst scenarios
worst = results.worst_scenarios(10)
```

## Walk-Forward Analysis

Located in [backtesting/walkforward.py](../../backtesting/walkforward.py)

Rolling window validation:

```python
from backtesting.walkforward import WalkForwardAnalyzer

analyzer = WalkForwardAnalyzer(
    train_window=252,     # 1 year training
    test_window=63,       # 3 months testing
    step=21               # Monthly rebalancing
)

results = analyzer.run(
    tickers=["AAPL"],
    strategy_factory=create_strategy
)

# Analyze out-of-sample performance
print(f"Avg OOS Sharpe: {results.avg_oos_sharpe}")
print(f"Walk-forward efficiency: {results.efficiency_ratio}")
```

## Scenario Testing

Located in [backtesting/scenario.py](../../backtesting/scenario.py)

Stress test against historical scenarios:

```python
from backtesting.scenario import ScenarioTester

tester = ScenarioTester()

# Add custom scenarios
tester.add_scenario("2008_crisis", crisis_data_2008)
tester.add_scenario("2020_covid", covid_data_2020)
tester.add_scenario("flash_crash", flash_crash_data)

# Add custom scenario
tester.add_scenario(
    name="custom_shock",
    prices=price_series,
    volatility=2.5  # 2.5x normal volatility
)

results = tester.run(strategy)
```

## Synthetic Data

Located in [backtesting/synthetic_data.py](../../backtesting/synthetic_data.py)

Generate synthetic price data:

```python
from backtesting.synthetic_data import SyntheticDataGenerator

generator = SyntheticDataGenerator(seed=42)

# Geometric Brownian Motion
gbm = generator.gbm(
    n_days=252,
    initial_price=100,
    drift=0.0002,
    volatility=0.02
)

# Jump Diffusion
jump = generator.jump_diffusion(
    n_days=252,
    initial_price=100,
    volatility=0.02,
    jump_intensity=0.1,
    jump_volatility=0.05
)

# Mean Reverting
mean_rev = generator.mean_reverting(
    n_days=252,
    initial_price=100,
    half_life=20,
    volatility=0.02
)
```

## Backtest Results

```python
@dataclass
class BacktestResult:
    total_return: float
    annualized_return: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    total_trades: int
    equity_curve: list[float]
    timestamps: list[datetime]
    trade_analysis: dict
    analyzer_results: dict
```

## CLI Usage

```bash
# Basic backtest
trading-engine-backtest --tickers AAPL,MSFT --start 2024-01-01

# With optimization
trading-engine-backtest --tickers AAPL --optimize --metric sharpe

# Monte Carlo
trading-engine-backtest --tickers AAPL --monte-carlo 1000

# Walk-forward
trading-engine-backtest --tickers AAPL --walk-forward
```

## API Endpoints

```bash
# Run backtest
POST /api/backtest
{
  "tickers": ["AAPL", "MSFT"],
  "start": "2020-01-01",
  "end": "2024-01-01",
  "initial_capital": 1000000,
  "commission": 0.001
}

# Get backtest results
GET /api/backtest/{backtest_id}

# List historical backtests
GET /api/backtest/history

# Run Monte Carlo
POST /api/backtest/{backtest_id}/monte-carlo
{
  "n_simulations": 1000
}
```

## Performance Considerations

- **Vectorized operations** using pandas/numpy where possible
- **Chunked data loading** for large datasets
- **Caching** of indicator calculations
- **Parallel execution** of Monte Carlo simulations
