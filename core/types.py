from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import pandas as pd

from .enums import OrderSide, OrderType, RegimeType, SignalDir, SignalType

# ──────────────────────────────────────────────
#  MARKET DATA
# ──────────────────────────────────────────────

@dataclass
class Bar:
    """Single OHLCV bar."""
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "timestamp": self.timestamp.isoformat(),
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
        }

    @classmethod
    def from_series(cls, row: pd.Series, symbol: str) -> "Bar":
        return cls(
            symbol=symbol,
            timestamp=row.name if isinstance(row.name, datetime) else row.get("timestamp", datetime.now()),
            open=float(row["open"]),
            high=float(row["high"]),
            low=float(row["low"]),
            close=float(row["close"]),
            volume=float(row.get("volume", 0)),
        )


# ──────────────────────────────────────────────
#  SIGNALS
# ──────────────────────────────────────────────

@dataclass
class QuantSignal:
    """Normalized signal from any indicator engine."""
    type: SignalType
    direction: SignalDir
    strength: float  # 0.0 to 1.0
    confidence: float  # 0.0 to 1.0
    symbol: str
    timeframe: str
    timestamp: datetime
    price: Optional[float] = None
    level: Optional[float] = None
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "direction": self.direction.value,
            "strength": self.strength,
            "confidence": self.confidence,
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "timestamp": self.timestamp.isoformat(),
            "price": self.price,
            "level": self.level,
            "metadata": self.metadata,
        }


@dataclass
class SignalMatrix:
    """Aggregated view of all current signals for all tickers."""
    timestamp: datetime
    signals: dict[str, list[QuantSignal]] = field(default_factory=dict)
    composite_scores: dict[str, float] = field(default_factory=dict)
    regime: Optional[RegimeState] = None

    def get_signals(self, symbol: str) -> list[QuantSignal]:
        return self.signals.get(symbol, [])

    def get_score(self, symbol: str) -> float:
        return self.composite_scores.get(symbol, 0.0)

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "signals": {
                sym: [s.to_dict() for s in sigs]
                for sym, sigs in self.signals.items()
            },
            "composite_scores": self.composite_scores,
            "regime": self.regime.to_dict() if self.regime else None,
        }


@dataclass
class RegimeState:
    """Current detected market regime."""
    primary: RegimeType
    confidence: float
    wasserstein_cluster: int = -1
    vol_regime: Optional[str] = None
    trend_regime: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "primary": self.primary.value,
            "confidence": self.confidence,
            "wasserstein_cluster": self.wasserstein_cluster,
            "vol_regime": self.vol_regime,
            "trend_regime": self.trend_regime,
            "metadata": self.metadata,
        }


# ──────────────────────────────────────────────
#  POSITIONS & PORTFOLIO
# ──────────────────────────────────────────────

@dataclass
class Position:
    symbol: str
    quantity: int
    side: OrderSide  # BUY for long, SHORT for short
    entry_price: float
    current_price: float
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0

    @property
    def market_value(self) -> float:
        return self.quantity * self.current_price

    def update_price(self, price: float):
        self.current_price = price
        if self.side == OrderSide.BUY:
            self.unrealized_pnl = (price - self.entry_price) * self.quantity
        else:
            self.unrealized_pnl = (self.entry_price - price) * self.quantity


@dataclass
class PortfolioState:
    """Snapshot of entire portfolio."""
    cash: float
    positions: dict[str, Position]
    total_value: float
    margin_used: float = 0.0
    margin_requirement: float = 0.0
    version: int = 0
    realized_gains: dict[str, dict[str, float]] = field(default_factory=dict)

    @property
    def long_exposure(self) -> float:
        return sum(p.market_value for p in self.positions.values() if p.side == OrderSide.BUY)

    @property
    def short_exposure(self) -> float:
        return sum(p.market_value for p in self.positions.values() if p.side == OrderSide.SHORT)

    @property
    def gross_exposure(self) -> float:
        return self.long_exposure + self.short_exposure

    @property
    def net_exposure(self) -> float:
        return self.long_exposure - self.short_exposure

    def copy(self) -> PortfolioState:
        return PortfolioState(
            cash=self.cash,
            positions={k: Position(**v.__dict__) for k, v in self.positions.items()},
            total_value=self.total_value,
            margin_used=self.margin_used,
            margin_requirement=self.margin_requirement,
            version=self.version + 1,
            realized_gains={k: dict(v) for k, v in self.realized_gains.items()},
        )

    def with_update(self, **kwargs) -> PortfolioState:
        updated = self.copy()
        for k, v in kwargs.items():
            setattr(updated, k, v)
        return updated


# ──────────────────────────────────────────────
#  ORDERS & EXECUTION
# ──────────────────────────────────────────────

@dataclass
class Order:
    symbol: str
    side: OrderSide
    quantity: float
    order_type: OrderType = OrderType.MARKET
    price: Optional[float] = None
    stop_price: Optional[float] = None
    reason: str = ""
    signal_ids: list[str] = field(default_factory=list)
    order_id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "side": self.side.value,
            "quantity": self.quantity,
            "order_type": self.order_type.value,
            "price": self.price,
            "stop_price": self.stop_price,
            "reason": self.reason,
            "order_id": self.order_id,
        }


@dataclass
class Fill:
    order_id: str
    symbol: str
    side: OrderSide
    quantity: int
    price: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    commission: float = 0.0


# ──────────────────────────────────────────────
#  DECISIONS & ANALYST OUTPUT
# ──────────────────────────────────────────────

@dataclass
class Decision:
    ticker: str
    action: str  # buy, sell, short, cover, hold
    quantity: float
    confidence: float = 0.0
    reasoning: str = ""


@dataclass
class RiskLimits:
    max_position_size_pct: float = 0.15
    max_leverage: float = 2.0
    max_drawdown_pct: float = 0.20
    min_cash_pct: float = 0.05
    max_concentration_pct: float = 0.25
    max_positions: int = 10
    stop_loss_atr_multiplier: float = 2.0


@dataclass
class AnalystSignal:
    agent: str
    ticker: str
    signal: str  # bullish, bearish, neutral
    confidence: float
    reasoning: str
    metadata: dict = field(default_factory=dict)
