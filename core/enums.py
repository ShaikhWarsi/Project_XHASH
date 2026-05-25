from enum import Enum


class SignalType(Enum):
    ORDER_BLOCK = "ob"
    FVG = "fvg"
    BOS = "bos"
    CHOCH = "choch"
    STRUCTURE = "structure"
    LIQUIDITY = "liquidity"
    CANDLE_PATTERN = "pattern"
    EQH_EQL = "eqh_eql"
    HARMONIC = "harmonic"
    SUPPORT_RESISTANCE = "s_r"
    REGIME = "regime"
    SENTIMENT = "sentiment"
    TREND = "trend"
    VOLATILITY = "volatility"
    ML_TRENDLINE = "ml_trendline"
    ML_PATTERN = "ml_pattern"
    HEAD_SHOULDERS = "head_shoulders"
    FLAGS_PENNANTS = "flags_pennants"


class SignalDir(Enum):
    BULLISH = 1
    BEARISH = -1
    NEUTRAL = 0


class RegimeType(Enum):
    BULL_TREND = "bull_trend"
    BEAR_TREND = "bear_trend"
    RANGE_BOUND = "range_bound"
    HIGH_VOLATILITY = "high_vol"
    LOW_VOLATILITY = "low_vol"
    CRISIS = "crisis"
    TRANSITION = "transition"


class Timeframe(Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H2 = "2h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"
    MN1 = "1M"


class OrderSide(Enum):
    BUY = "buy"
    SELL = "sell"
    SHORT = "short"
    COVER = "cover"


class OrderType(Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


class AgentRole(Enum):
    VALUATION = "valuation"
    SENTIMENT = "sentiment"
    FUNDAMENTALS = "fundamentals"
    TECHNICAL = "technical_llm"
    PORTFOLIO_MANAGER = "portfolio_manager"
