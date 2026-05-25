# FinScript DSL

FinScript is a custom domain-specific language (DSL) for defining trading strategies. It includes a full compiler stack with lexer, parser, AST, interpreter, and export targets.

## Overview

Located in [finscript/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\) directory.

```
┌─────────────────────────────────────────────────────────────┐
│                      FinScript Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│  Source Code → Lexer → Parser → AST → Interpreter → Result   │
│       │                                            │         │
│       └────────────── Export Targets ──────────────┘         │
│                  Pine Script | MT5 | TD Ameritrade           │
└─────────────────────────────────────────────────────────────┘
```

## Language Syntax

### Basic Structure

```finscript
strategy("My Strategy", overlay=true)

 // Input parameters
input FastMALength = 9
input SlowMALength = 21
input StopLossPct = 2.0

 // Indicators
fastMA = sma(close, FastMALength)
slowMA = sma(close, SlowMALength)

 // Entry signals
longCondition = crossover(fastMA, slowMA)
shortCondition = crossunder(fastMA, slowMA)

 // Trading logic
if longCondition
    strategy.entry("Long", strategy.long)

if shortCondition
    strategy.entry("Short", strategy.short)

 // Stop loss
strategy.exit("Exit", stop=close * (1 - StopLossPct / 100))
```

### Variables

```finscript
// Constants
const MaxPositions = 5
const RiskFreeRate = 0.04

// Variables
var count = 0
var highestHigh = high

// Series (随时间变化的序列)
sma20 = sma(close, 20)
ema50 = ema(close, 50)
```

### Operators

```finscript
// Arithmetic
a = 10 + 5    // Addition
b = 10 - 5    // Subtraction
c = 10 * 5    // Multiplication
d = 10 / 5    // Division
e = 10 % 3    // Modulo
f = 10 ^ 2    // Power

// Comparison
a == b        // Equal
a != b        // Not equal
a > b         // Greater than
a < b         // Less than
a >= b        // Greater or equal
a <= b        // Less or equal

// Logical
and           // Logical AND
or            // Logical OR
not           // Logical NOT
```

### Built-in Indicators (40+)

```finscript
// Moving Averages
sma(close, 20)           // Simple MA
ema(close, 20)           // Exponential MA
wma(close, 20)           // Weighted MA
vwma(close, 20)          // Volume-weighted MA

// Momentum
rsi(close, 14)           // Relative Strength Index
stoch(high, low, close, 14)  // Stochastic
macd(close, 12, 26, 9)   // MACD
momentum(close, 10)     // Momentum

// Volatility
atr(14)                  // Average True Range
bbands(close, 20, 2)    // Bollinger Bands
kc(high, low, close, 20, 2)  // Keltner Channel

// Volume
obv()                    // On-Balance Volume
vwap()                   // Volume-Weighted Average Price
ad()                     // Accumulation/Distribution

// Trend
adx(high, low, close, 14)  // Average Directional Index
supertrend(high, low, close, 10, 3)  // Supertrend
```

### Built-in Functions

```finscript
// Math functions
abs(x)                    // Absolute value
max(a, b)                 // Maximum
min(a, b)                 // Minimum
round(x, decimals)        // Round to decimals
floor(x)                  // Floor
ceil(x)                   // Ceiling
sqrt(x)                   // Square root
log(x)                    // Natural logarithm

// Technical analysis
crossover(a, b)           // Cross above
crossunder(a, b)          // Cross below
highest(series, length)   // Highest value
lowest(series, length)    // Lowest value
change(series)            // Period change
pct_change(series, length) // Percentage change

// Strategy controls
strategy.entry(id, side)  // Place entry order
strategy.exit(id, ...)    // Place exit order
strategy.close(id)        // Close position
```

### Strategy Examples

```finscript
// Trend following strategy
strategy("Trend Follower")

input fastLength = 10
input slowLength = 30
input stopLoss = 2.0

fastMA = ema(close, fastLength)
slowMA = ema(close, slowLength)

if crossover(fastMA, slowMA)
    strategy.entry("Long", strategy.long)

if crossunder(fastMA, slowMA)
    strategy.close("Long")

// Stop loss
longStop = close * (1 - stopLoss / 100)
strategy.exit("Long Exit", stop=longStop)
```

```finscript
// Mean reversion strategy
strategy("Mean Reversion")

input length = 20
input stdDev = 2.0
input stopLoss = 1.5

sma = sma(close, length)
std = stdev(close, length)
upper = sma + stdDev * std
lower = sma - stdDev * std

if close < lower
    strategy.entry("Long", strategy.long)

if close > upper
    strategy.entry("Short", strategy.short)

strategy.exit("Exit", stop=close * (1 - stopLoss / 100))
```

## Compiler Components

### Lexer

Located in [finscript/lexer.py](../../finscript/lexer.py)

Tokenizes source code:

```python
from finscript.lexer import Lexer

lexer = Lexer()
tokens = lexer.tokenize(source_code)

for token in tokens:
    print(f"{token.type}: {token.value} at {token.position}")
```

### Parser

Located in [finscript/parser.py](../../finscript/parser.py)

Generates AST:

```python
from finscript.parser import Parser

parser = Parser()
ast = parser.parse(tokens)

print(ast.to_json())
```

### AST Nodes

Located in [finscript/ast.py](../../finscript/ast.py)

```python
from finscript.ast import (
    StrategyNode,
    InputNode,
    VariableNode,
    IfNode,
    FunctionCallNode,
    IndicatorNode
)
```

### Interpreter

Located in [finscript/interpreter.py](../../finscript/interpreter.py)

Executes strategy:

```python
from finscript.interpreter import Interpreter

interpreter = Interpreter()
result = interpreter.execute(ast, bars_df)

print(result.trades)
print(result.equity_curve)
```

## Export Targets

### TradingView Pine Script

Located in [finscript/export/pine_script.py](../../finscript/export/pine_script.py)

```python
from finscript.export.pine_script import PineScriptExporter

exporter = PineScriptExporter()
pinescript_code = exporter.export(ast)

# Write to file
with open("strategy.pine", "w") as f:
    f.write(pinescript_code)
```

### MetaTrader 5

Located in [finscript/export/mt5.py](../../finscript/export/mt5.py)

```python
from finscript.export.mt5 import MT5Exporter

exporter = MT5Exporter()
mt5_code = exporter.export(ast)
```

### TD Ameritrade

Located in [finscript/export/tdx.py](../../finscript/export/tdx.py)

```python
from finscript.export.tdx import TDExporter

exporter = TDExporter()
td_code = exporter.export(ast)
```

## API Usage

```bash
# Compile FinScript
POST /api/finscript/compile
{
  "source": "strategy('My Strategy')..."
}

# Backtest FinScript
POST /api/finscript/backtest
{
  "source": "strategy('My Strategy')...",
  "tickers": ["AAPL"],
  "start": "2020-01-01"
}

# Export to Pine Script
POST /api/finscript/export
{
  "source": "strategy('My Strategy')...",
  "target": "pine_script"
}
```

## Adding Custom Indicators

```python
from finscript.builtins import BuiltinIndicator

class MyCustomIndicator(BuiltinIndicator):
    name = "my_indicator"
    description = "My custom indicator"
    parameters = ["fast", "slow"]

    def compute(self, bars, **kwargs):
        fast = kwargs.get("fast", 10)
        slow = kwargs.get("slow", 30)

        fast_ma = bars["close"].rolling(fast).mean()
        slow_ma = bars["close"].rolling(slow).mean()

        return fast_ma - slow_ma

# Register the indicator
from finscript.interpreter import Interpreter
Interpreter.register_indicator("my_indicator", MyCustomIndicator)
```

## Error Handling

```python
try:
    parser = Parser()
    ast = parser.parse(tokens)
except LexerError as e:
    print(f"Lexical error at {e.position}: {e.message}")
except ParserError as e:
    print(f"Syntax error at {e.position}: {e.message}")
except InterpreterError as e:
    print(f"Runtime error: {e.message}")
```
