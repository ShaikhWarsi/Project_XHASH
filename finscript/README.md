# FinScript — Trading Strategy DSL

A PineScript-inspired domain-specific language for defining trading strategies, built into the Trading Engine.

## Example Strategy

```
strategy("SMA Cross", overlay=true)

fast_sma = sma(close, 10)
slow_sma = sma(close, 30)

if crossover(fast_sma, slow_sma)
    buy("AAPL", 100)

if crossunder(fast_sma, slow_sma)
    sell("AAPL", 100)

plot(fast_sma)
plot(slow_sma)
```

## Built-in Functions (40+)

### Moving Averages
| Function | Description |
|----------|-------------|
| `sma(source, length)` | Simple moving average |
| `ema(source, length)` | Exponential moving average |
| `wma(source, length)` | Weighted moving average |
| `hma(source, length)` | Hull moving average |
| `rma(source, length)` | Running moving average |

### Oscillators
| Function | Description |
|----------|-------------|
| `rsi(source, length)` | Relative Strength Index (0-100) |
| `macd(source)` | MACD line |
| `stoch(high, low, close, k, d)` | Stochastic oscillator |
| `mfi(high, low, close, volume, length)` | Money Flow Index |
| `cci(high, low, close, length)` | Commodity Channel Index |
| `williams_r(high, low, close, length)` | Williams %R |

### Volatility
| Function | Description |
|----------|-------------|
| `bb(source, length, mult)` | Bollinger Bands |
| `atr(high, low, close, length)` | Average True Range |
| `tr(high, low, close)` | True Range |

### Trend
| Function | Description |
|----------|-------------|
| `adx(high, low, close, length)` | Average Directional Index |
| `sar(high, low, start, inc, max)` | Parabolic SAR |
| `vwap(high, low, close, volume)` | Volume-Weighted Average Price |

### Pattern Detection
| Function | Description |
|----------|-------------|
| `crossover(a, b)` | True when a crosses above b |
| `crossunder(a, b)` | True when a crosses below b |
| `cross(a, b)` | True when a crosses b (either direction) |
| `pivot_high(high, left, right)` | Detect pivot highs |
| `pivot_low(low, left, right)` | Detect pivot lows |

### Statistics
| Function | Description |
|----------|-------------|
| `highest(source, length)` | Highest value over period |
| `lowest(source, length)` | Lowest value over period |
| `stdev(source, length)` | Standard deviation |
| `linreg(source, length)` | Linear regression |
| `correlation(a, b, length)` | Correlation coefficient |
| `beta(a, b, length)` | Beta coefficient |
| `percentrank(source, length)` | Percentile rank |

### Volume
| Function | Description |
|----------|-------------|
| `obv(close, volume)` | On-Balance Volume |

### Performance
| Function | Description |
|----------|-------------|
| `sharpe(returns, rf)` | Sharpe ratio |
| `sortino(returns, rf)` | Sortino ratio |
| `max_drawdown(equity)` | Maximum drawdown |

### Utilities
| Function | Description |
|----------|-------------|
| `change(source, length)` | Period-over-period change |
| `roc(source, length)` | Rate of change (%) |
| `cum(source)` | Cumulative sum |
| `abs(x)` | Absolute value |
| `sqrt(x)` | Square root |
| `log(x)` | Natural log |
| `exp(x)` | Exponential |
| `min(a, b)` | Minimum |
| `max(a, b)` | Maximum |
| `floor(x)` / `ceil(x)` / `round(x)` | Rounding |
| `sin(x)` / `cos(x)` / `tan(x)` | Trigonometry |

## OHLC Data Access

```
close   — Closing price series
open    — Opening price series
high    — High price series
low     — Low price series
volume  — Volume series
hl2     — (high + low) / 2
hlc3    — (high + low + close) / 3
ohlc4   — (open + high + low + close) / 4
```

## Trading Primitives

```
buy("SYMBOL", quantity)       — Generate buy signal
sell("SYMBOL", quantity)      — Generate sell signal
plot(expression)              — Plot a series
alert(message, frequency)     — Create alert
print(message)                — Print debug output
strategy(name, opts...)      — Define strategy metadata
input(name, default)          — Declare user input
```

## Control Flow

```
if condition
    ...
else if condition
    ...
else
    ...

for i = start to end
    ...

while condition
    ...

switch expression
    case value
        ...
    default
        ...

fn name(params)
    ...
    return value
```

## Using in Python

```python
from finscript import execute

data = {"AAPL": dataframe_with_ohlcv}
result = execute(code, data)
# result.signals, result.plots, result.strategy, result.globals
```
