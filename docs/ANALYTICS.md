# Analytics & Metrics

The Trading Engine includes comprehensive analytics with 22+ performance metrics, portfolio optimization, attribution analysis, and CFA-level financial analytics.

## Performance Metrics

Located in [analytics/metrics.py](../../analytics/metrics.py)

### Metrics Available

```python
from analytics.metrics import PerformanceMetrics

metrics = PerformanceMetrics.compute(
    equity_curve=equity_list,
    returns=returns_list,
    benchmark_returns=benchmark_list
)
```

| Category | Metric | Description |
|----------|--------|-------------|
| **Returns** | `total_return` | Total return over period |
| | `annualized_return` | CAGR |
| | `cumulative_return` | Total cumulative return |
| | `alpha` | Jensen's alpha vs benchmark |
| | `beta` | Beta vs benchmark |
| **Risk** | `annualized_volatility` | Standard deviation of returns |
| | `max_drawdown` | Maximum peak-to-trough |
| | `max_drawdown_duration` | Days in longest drawdown |
| | `value_at_risk_95` | VaR at 95% confidence |
| | `conditional_var_95` | CVaR / Expected Shortfall |
| **Risk-Adjusted** | `sharpe_ratio` | (Return - Rf) / Volatility |
| | `sortino_ratio` | (Return - Rf) / Downside Dev |
| | `calmar_ratio` | Return / Max Drawdown |
| | `ulcer_index` | Downside risk measure |
| | `martin_ratio` | (Return - Rf) / Ulcer Index |
| **Trading** | `win_rate` | Percentage of profitable trades |
| | `profit_factor` | Gross profit / Gross loss |
| | `total_trades` | Number of trades |
| | `avg_win` | Average winning trade |
| | `avg_loss` | Average losing trade |
| | `expectancy` | Expected value per trade |
| **Stability** | `batting_average` | % of periods beating benchmark |
| | `upside_capture` | Upside capture ratio |
| | `downside_capture` | Downside capture ratio |

## Portfolio Optimization

Located in [analytics/optimizers/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\analytics\optimizers\)

### Mean-Variance (Markowitz)

```python
from analytics.optimizers.mean_variance import MeanVarianceOptimizer

optimizer = MeanVarianceOptimizer(
    risk_aversion=1.0
)

weights = optimizer.optimize(
    returns=returns_df,
    cov_matrix=cov_matrix
)
```

### Risk Parity

```python
from analytics.optimizers.risk_parity import RiskParityOptimizer

optimizer = RiskParityOptimizer()
weights = optimizer.optimize(returns_df, cov_matrix)
```

### Equal Volatility

```python
from analytics.optimizers.equal_volatility import EqualVolatilityOptimizer

optimizer = EqualVolatilityOptimizer()
weights = optimizer.optimize(returns_df)
```

### Maximum Diversification

```python
from analytics.optimizers.max_diversification import MaxDiversificationOptimizer

optimizer = MaxDiversificationOptimizer()
weights = optimizer.optimize(returns_df, cov_matrix)
```

## Attribution Analysis

Located in [analytics/attribution.py](../../analytics/attribution.py)

```python
from analytics.attribution import AttributionAnalyzer

analyzer = AttributionAnalyzer()

# Brinson-Hood-Beebower attribution
attribution = analyzer.brinson(
    portfolio_returns=portfolio_rets,
    benchmark_returns=benchmark_rets,
    holdings=holdings,
    benchmark_holdings=benchmark_holdings
)

# Factor attribution
factor_attribution = analyzer.factor(
    portfolio_returns=returns,
    factor_exposures=exposures,
    factor_returns=factor_rets
)
```

## CFA Analytics

Located in [analytics/cfa/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\analytics\cfa\) - Comprehensive financial analysis toolkit:

### Portfolio Theory

```python
from analytics.cfa.portfolio import PortfolioAnalyzer

analyzer = PortfolioAnalyzer()
efficient_frontier = analyzer.efficient_frontier(returns_df)
optimal_portfolio = analyzer.optimal_portfolio(returns_df, risk_aversion=1.0)
```

### Fixed Income

```python
from analytics.cfa.fixed_income import FixedIncomeAnalyzer

analyzer = FixedIncomeAnalyzer()

# Duration, convexity
metrics = analyzer.bond_metrics(
    face_value=1000,
    coupon_rate=0.05,
    maturity_years=10,
    yield_to_maturity=0.04
)

# Yield curve analysis
curve_metrics = analyzer.yield_curve(treasury_yields)
```

### Derivatives

```python
from analytics.cfa.derivatives import DerivativesAnalyzer

analyzer = DerivativesAnalyzer()

# Black-Scholes option pricing
price = analyzer.black_scholes(
    spot=100,
    strike=105,
    time_to_expiry=0.5,
    risk_free_rate=0.05,
    volatility=0.2,
    is_call=True
)

# Greeks
greeks = analyzer.greeks(
    spot=100, strike=105, time=0.5,
    volatility=0.2, rate=0.05
)
```

### Valuation

```python
from analytics.cfa.valuation import ValuationAnalyzer

analyzer = ValuationAnalyzer()

# DCF valuation
dcf_value = analyzer.dcf(
    cash_flows=cf_list,
    discount_rate=0.10,
    terminal_growth=0.03
)

# Relative valuation
relative_value = analyzer.relative(
    metric="pe_ratio",
    ticker_pe=15.0,
    sector_avg_pe=18.0
)
```

### Financial Statements

```python
from analytics.cfa.financial_statements import FinancialStatementAnalyzer

analyzer = FinancialStatementAnalyzer()

# Ratio analysis
ratios = analyzer.ratios(
    income_statement=income_df,
    balance_sheet=balance_df,
    cash_flow=cashflow_df
)
```

## Reports

Located in [analytics/reports.py](../../analytics/reports.py)

```python
from analytics.reports import ReportGenerator

generator = ReportGenerator()

# Generate performance report
report = generator.performance_report(
    backtest_results=results,
    benchmark="SPY",
    period="2020-01-01 to 2024-01-01"
)

# Export to HTML
generator.to_html(report, output_file="report.html")

# Export to PDF
generator.to_pdf(report, output_file="report.pdf")
```

## Dashboard Data

Located in [analytics/dashboard.py](../../analytics/dashboard.py)

```python
from analytics.dashboard import DashboardData

data = DashboardData()

# Get dashboard snapshot
snapshot = data.get_snapshot(
    portfolio_id="main",
    include_positions=True,
    include_metrics=True
)
```

## API Endpoints

```bash
# Get performance metrics
GET /api/metrics/performance?portfolio_id=main

# Get risk metrics
GET /api/metrics/risk?portfolio_id=main

# Run portfolio optimization
POST /api/portfolio_optimization
{
  "method": "risk_parity",
  "tickers": ["AAPL", "MSFT", "GOOGL"],
  "returns_source": "historical"
}

# Get attribution
GET /api/analytics/attribution?portfolio_id=main

# Get CFA metrics
GET /api/cfa/valuation?ticker=AAPL
GET /api/cfa/ratios?ticker=AAPL
GET /api/cfa/fixed_income?bond_id=us10y
```

## Custom Metrics

```python
from analytics.metrics import PerformanceMetrics
from dataclasses import dataclass

@dataclass
class CustomMetrics(PerformanceMetrics):
    custom_metric: float = 0.0

    @classmethod
    def compute(cls, equity_curve, **kwargs):
        base = super().compute(equity_curve, **kwargs)
        # Add custom calculations
        base.custom_metric = cls.calculate_custom(equity_curve)
        return base
```
