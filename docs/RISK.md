# Risk Management

The Trading Engine includes comprehensive risk management with multiple layers of protection including position limits, stop-losses, circuit breakers, and intelligent position sizing.

## Risk Architecture

```
Order Submission
      │
      ▼
┌─────────────────┐
│ Circuit Breaker │ ← Global risk state check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Position Limits │ ← Per-symbol, sector limits
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Stop Loss     │ ← Existing protective stops
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Position Sizing │ ← Kelly, fixed fractional
└────────┬────────┘
         │
         ▼
   Execution or Rejection
```

## Core Components

### Risk Engine

Located in [risk/engine.py](../../risk/engine.py)

The central hub that coordinates all risk checks:

```python
from risk.engine import RiskEngine

engine = RiskEngine(
    limits=risk_limits,
    position_limits=position_limits,
    stop_loss=stop_loss_tracker,
    position_sizer=position_sizer,
    circuit_breaker=circuit_breaker
)

# Validate an order
passed, message = engine.validate_order(order, portfolio, current_price)
if not passed:
    raise OrderRejected(f"Risk check failed: {message}")
```

### Position Limits

Located in [risk/limits.py](../../risk/limits.py)

Defines and enforces position-level constraints:

```python
from risk.limits import PositionLimits
from core.types import RiskLimits

limits = RiskLimits(
    max_position_size=0.1,      # 10% of portfolio per position
    max_sector_exposure=0.3,    # 30% per sector
    max_total_exposure=1.0,     # 100% total
    max_leverage=1.0
)

position_limits = PositionLimits(limits)
```

### Stop Loss Tracker

Located in [risk/stop_loss.py](../../risk/stop_loss.py)

ATR-based trailing stop implementation:

```python
from risk.stop_loss import StopLossTracker

tracker = StopLossTracker(
    atr_period=14,
    atr_multiplier=2.0,  # 2x ATR stop distance
    trailing=True         # Activate trailing once in profit
)

# Check stop loss
passed, message = tracker.check(order, portfolio, current_price)

# Update stops after price change
tracker.update(portfolio)
```

### Position Sizer

Located in [risk/position_sizing.py](../../risk/position_sizing.py)

Multiple sizing methodologies:

```python
from risk.position_sizing import PositionSizer, SizingMethod

sizer = PositionSizer(method=SizingMethod.KELLY)

# Kelly calculation
size = sizer.calculate(
    account_value=100000,
    risk_per_trade=0.02,  # 2% risk
    entry_price=100,
    stop_price=95
)

# Fixed fractional
sizer = PositionSizer(method=SizingMethod.FIXED_FRACTIONAL)
size = sizer.calculate(
    account_value=100000,
    risk_per_trade=0.02,
    entry_price=100,
    stop_price=95
)
```

**Sizing Methods:**

| Method | Description |
|--------|-------------|
| `KELLY` | Kelly criterion (optimal growth) |
| `FIXED_FRACTIONAL` | Fixed percentage of account |
| `FIXED_DOLLAR` | Fixed dollar amount |
| `VOLATILITY_ADJUSTED` | Adjusted for recent volatility |

### Circuit Breakers

Located in [risk/circuit_breakers.py](../../risk/circuit_breakers.py)

Automated trading halts based on market conditions:

```python
from risk.circuit_breakers import CircuitBreaker

breaker = CircuitBreaker(
    max_daily_drawdown=0.05,      # 5% daily DD halts trading
    max_consecutive_losses=5,
    max_volatility_scalar=3.0,     # 3x normal volatility
    cooldown_minutes=60
)

# Check before order
passed, message = breaker.check(portfolio)

# Update breaker state
breaker.update(portfolio)
```

## Risk Limits Configuration

```python
from core.types import RiskLimits

limits = RiskLimits(
    # Position limits
    max_position_size=0.1,           # Max 10% per position
    max_sector_exposure=0.3,         # Max 30% per sector
    max_total_exposure=1.0,          # Max 100% deployed
    max_leverage=1.0,                # No leverage

    # Loss limits
    max_daily_loss=0.05,            # Max 5% daily loss
    max_drawdown=0.20,               # Max 20% drawdown

    # Order limits
    max_order_size=0.1,              # Max 10% per order
    max_orders_per_day=100,

    # Stop loss
    default_stop_pct=0.02,           # 2% default stop
    use_trailing_stop=True,
    trailing_stop_pct=0.015,

    # Position sizing
    default_sizing_method="kelly",
    kelly_fraction=0.5,             # Half-Kelly
)
```

## Risk API Endpoints

```bash
# Get current risk state
GET /api/risk/state

# Get position limits
GET /api/risk/limits

# Update risk limits
PUT /api/risk/limits

# Get circuit breaker status
GET /api/risk/circuit-breaker

# Reset circuit breaker
POST /api/risk/circuit-breaker/reset
```

## Risk Metrics

Available through the analytics system:

| Metric | Description |
|--------|-------------|
| VaR 95% | Value at Risk (95% confidence) |
| CVaR 95% | Conditional VaR (expected shortfall) |
| Max Drawdown | Maximum peak-to-trough decline |
| Sharpe Ratio | Risk-adjusted return |
| Sortino Ratio | Downside risk-adjusted return |
| Calmar Ratio | Return / Max Drawdown |

## Custom Risk Rules

```python
from risk.engine import RiskEngine

class MyRiskEngine(RiskEngine):
    def validate_order(self, order, portfolio, price):
        # Add custom checks
        passed, msg = super().validate_order(order, portfolio, price)
        if not passed:
            return False, msg

        # Custom rule: no trading before 10am
        if datetime.now().hour < 10:
            return False, "Trading blocked: before market open"

        return True, ""
```

## Risk Dashboard

The frontend includes a dedicated Risk Dashboard page at `RiskDashboard.tsx` showing:

- Current portfolio risk metrics
- Position-level risk breakdown
- Circuit breaker status
- Drawdown charts
- VaR projections
