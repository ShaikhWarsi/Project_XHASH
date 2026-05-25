# Signal Generation Systems

The Trading Engine includes 23+ signal generation engines spanning technical analysis, pattern recognition, machine learning, and regime detection.

## Signal Types

Defined in [core/enums.py](../../core/enums.py):

```python
class SignalType(Enum):
    ORDER_BLOCK = "ob"           # Smart Money Concepts
    FVG = "fvg"                 # Fair Value Gap
    BOS = "bos"                 # Break of Structure
    CHOCH = "choch"             # Change of Character
    STRUCTURE = "structure"     # Market Structure
    LIQUIDITY = "liquidity"     # Liquidity Zones
    CANDLE_PATTERN = "pattern"  # Candlestick Patterns
    EQH_EQL = "eqh_eql"        # EQH/EQL Levels
    HARMONIC = "harmonic"       # Harmonic Patterns
    SUPPORT_RESISTANCE = "s_r"  # Support/Resistance
    REGIME = "regime"          # Market Regime
    SENTIMENT = "sentiment"    # Sentiment Signals
    TREND = "trend"            # Trend Direction
    VOLATILITY = "volatility"  # Volatility State
    ML_TRENDLINE = "ml_trendline"  # ML Detected
    ML_PATTERN = "ml_pattern"  # ML Pattern Recognition
    HEAD_SHOULDERS = "head_shoulders"
    FLAGS_PENNANTS = "flags_pennants"
```

## Signal Engines

### Smart Money Concepts (SMC)

Located in [signals/indicators/smc.py](../../signals/indicators/smc.py)

| Signal | Description |
|--------|-------------|
| **Order Blocks** | Institutional order zone detection |
| **Fair Value Gaps** | Imbalance zones between candles |
| **Break of Structure** | Trend continuation signals |
| **Change of Character** | Trend reversal detection |
| **Liquidity Zones** | Stop hunt and liquidity grabs |

```python
from signals.indicators.smc import SMCEngine

engine = SMCEngine()
signals = engine.compute(bars_df)
```

### Harmonic Patterns

Located in [signals/indicators/harmonics.py](../../signals/indicators/harmonics.py)

Supported patterns:
- Gartley
- Butterfly
- Bat
- Crab
- Shark
- Cypher
- Deep Crab
- Navaratna

```python
from signals.indicators.harmonics import HarmonicEngine

engine = HarmonicEngine(pattern_types=["gartley", "butterfly", "bat"])
signals = engine.scan(bars_df)
```

### Head & Shoulders

Located in [signals/indicators/head_shoulders.py](../../signals/indicators/head_shoulders.py)

Detects classical reversal patterns:
- Head & Shoulders
- Inverse Head & Shoulders
- Double Top/Bottom
- Triple Top/Bottom

```python
from signals.indicators.head_shoulders import HeadShouldersEngine

engine = HeadShouldersEngine()
signals = engine.find_patterns(bars_df)
```

### Flags & Pennants

Located in [signals/indicators/flags_pennants.py](../../signals/indicators/flags_pennants.py)

| Pattern | Description |
|---------|-------------|
| Bull Flag | Ascending channel after uptrend |
| Bear Flag | Descending channel after downtrend |
| Pennant | Small consolidation after sharp move |
| Wedge | Converging trendlines |

### Price Action

Located in [signals/indicators/price_action.py](../../signals/indicators/price_action.py)

- Pin bars (hammer, shooting star)
- Engulfing candles
- Morning/Evening Star
- Doji patterns
- Inside/Outside bars

### Support & Resistance

Located in [signals/indicators/support_resistance.py](../../signals/indicators/support_resistance.py)

- Horizontal levels
- Diagonal trendlines
- Dynamic levels (moving averages)
- Fibonacci retracements
- Pivot points

### Market Structure

Located in [signals/indicators/market_structure.py](../../signals/indicators/market_structure.py)

- Swing highs/lows
- Structure breaks
- Equal highs/lows
- Break of structure (BOS)
- Change of character (CHOCH)

## Regime Detection

Located in [signals/structure_state.py](../../signals/structure_state.py)

### Trend Regime

```python
class RegimeType(Enum):
    BULL_TREND = "bull_trend"
    BEAR_TREND = "bear_trend"
    RANGE_BOUND = "range_bound"
    TRANSITION = "transition"
```

### Volatility Regime

```python
class RegimeType(Enum):
    HIGH_VOLATILITY = "high_vol"
    LOW_VOLATILITY = "low_vol"
    CRISIS = "crisis"
```

### Methods Used

- **Wasserstein Distance**: Distribution-based regime detection
- **ATR-based**: Volatility envelope analysis
- **ADX**: Trend strength measurement
- **Rolling Statistics**: Mean reversion detection

## Machine Learning Signals

Located in [signals/ml/](../../signals/ml/)

### Pattern Mining

```python
from signals.ml.pattern_mining import PatternMiner

miner = PatternMiner(model="xgboost")
patterns = miner.detect(bars_df)
```

### Meta-Labeling

```python
from signals.ml.meta_labeling import MetaLabeler

labeler = MetaLabeler()
labels = labeler.generate(primary_signals, market_features)
```

### Feature Store

Located in [signals/features/](../../signals/features/)

Uses tsfresh for automated feature extraction:
- 40+ statistical features per time series
- Automatic relevance testing
- Feature selection and reduction

## Alpha Zoo (158+ Factors)

Located in [signals/alpha_zoo/](../../signals/alpha_zoo/)

### Qlib158 Factors

Time-varying moving averages, rank operators, correlation, etc.

```python
from signals.alpha_zoo import QlibFactors

factors = QlibFactors.get_factor("wvma60")
```

### GTJA191 Factors

Chinese quantitative factors from the GuoTaiJianAn library.

## Signal Composite

Located in [signals/composite.py](../../signals/composite.py)

Combines multiple signal engines into a unified output:

```python
from signals.composite import SignalComposite

composite = SignalComposite(engines=[smc, harmonics, regime])
result = composite.compute(bars_df)
```

## Signal Output Format

```python
@dataclass
class QuantSignal:
    type: SignalType
    direction: SignalDir  # BULLISH, BEARISH, NEUTRAL
    strength: float      # 0.0 to 1.0
    confidence: float    # 0.0 to 1.0
    symbol: str
    timeframe: str
    timestamp: datetime
    price: Optional[float]
    level: Optional[float]
    metadata: dict
```

## Using Signals in Trading

```python
from signals import SignalEngineRegistry

# Get all registered engines
registry = SignalEngineRegistry()
engines = registry.list_engines()

# Run specific engine
engine = registry.get_engine("smc")
signals = engine.compute(bars_df)

# Run all engines
all_signals = registry.run_all(bars_df)
```

## Adding Custom Signal Engines

```python
from signals.base import SignalEngine, SignalResult
from core.enums import SignalType

class MySignal(SignalEngine):
    @property
    def signal_type(self) -> SignalType:
        return SignalType.TREND

    def compute(self, bars: pd.DataFrame) -> list[QuantSignal]:
        # Your signal logic here
        signals = []
        # ... generate signals
        return signals

# Register the engine
SignalEngineRegistry.register("my_signal", MySignal)
```
