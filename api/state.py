from __future__ import annotations

import asyncio
import logging
from copy import deepcopy
from datetime import datetime
from typing import Optional

from analytics.attribution import AttributionResult
from analytics.metrics import PerformanceMetrics
from core.enums import OrderSide, SignalType, SignalDir, RegimeType
from core.types import PortfolioState, SignalMatrix, Position, QuantSignal, RegimeState

logger = logging.getLogger(__name__)

MAX_HISTORY_SIZE = 10000


class AppState:
    """Shared in-memory state for the API server.

    Async-safe: all mutable operations use asyncio.Lock for coroutine safety.
    Synchronous wrappers are provided for backward compatibility with CLI/scripts.
    """

    def __init__(self):
        self._lock = asyncio.Lock()
        self._portfolio = PortfolioState(cash=0.0, positions={}, total_value=0.0)
        self._signals: Optional[SignalMatrix] = None
        self._metrics: Optional[PerformanceMetrics] = None
        self._attribution: Optional[AttributionResult] = None
        self._open_orders: list[dict] = []
        self._portfolio_history: list[dict] = []
        self._trades: list[dict] = []

    # --- Async API (preferred for async routes) ---

    async def async_get_portfolio(self) -> PortfolioState:
        async with self._lock:
            return deepcopy(self._portfolio)

    async def async_set_portfolio(self, value: PortfolioState):
        async with self._lock:
            self._portfolio = deepcopy(value)
            self._portfolio_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "total_value": value.total_value,
                "cash": value.cash,
            })
            if len(self._portfolio_history) > MAX_HISTORY_SIZE:
                self._portfolio_history = self._portfolio_history[-MAX_HISTORY_SIZE:]

    async def async_get_signals(self) -> Optional[SignalMatrix]:
        async with self._lock:
            return deepcopy(self._signals) if self._signals else None

    async def async_set_signals(self, value: SignalMatrix):
        async with self._lock:
            self._signals = deepcopy(value)

    async def async_get_metrics(self) -> Optional[PerformanceMetrics]:
        async with self._lock:
            return deepcopy(self._metrics) if self._metrics else None

    async def async_set_metrics(self, value: PerformanceMetrics):
        async with self._lock:
            self._metrics = deepcopy(value)

    async def async_get_attribution(self) -> Optional[AttributionResult]:
        async with self._lock:
            return deepcopy(self._attribution) if self._attribution else None

    async def async_set_attribution(self, value: AttributionResult):
        async with self._lock:
            self._attribution = deepcopy(value)

    async def async_get_open_orders(self) -> list[dict]:
        async with self._lock:
            return deepcopy(self._open_orders)

    async def async_set_open_orders(self, orders: list[dict]):
        async with self._lock:
            self._open_orders = deepcopy(orders)

    async def async_get_portfolio_history(self) -> list[dict]:
        async with self._lock:
            return deepcopy(self._portfolio_history)

    async def async_get_trades(self) -> list[dict]:
        async with self._lock:
            return deepcopy(self._trades)

    async def async_add_trade(self, trade: dict):
        async with self._lock:
            self._trades.append(deepcopy(trade))

    async def async_snapshot(self) -> dict:
        async with self._lock:
            p = self._portfolio
            m = self._metrics
            orders = list(self._open_orders)
            att = self._attribution
            sig = self._signals.to_dict() if self._signals else {}

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "portfolio": {
                "cash": p.cash,
                "total_value": p.total_value,
                "margin_used": p.margin_used,
                "margin_req": p.margin_requirement,
                "realized_gains": sum(
                    v.get("long", 0.0) + v.get("short", 0.0) for v in p.realized_gains.values()
                ) if p.realized_gains else 0.0,
                "positions": {
                    sym: {
                        "symbol": pos.symbol,
                        "quantity": pos.quantity,
                        "side": pos.side.value,
                        "entry_price": pos.entry_price,
                        "current_price": pos.current_price,
                        "unrealized_pnl": pos.unrealized_pnl,
                        "realized_pnl": pos.realized_pnl,
                        "market_value": pos.market_value,
                    }
                    for sym, pos in p.positions.items()
                },
            },
            "signals": sig,
            "metrics": {
                "total_return": m.total_return if m else 0,
                "annualized_return": m.annualized_return if m else 0,
                "annualized_vol": m.annualized_volatility if m else 0,
                "sharpe_ratio": m.sharpe_ratio if m else 0,
                "sortino_ratio": m.sortino_ratio if m else 0,
                "calmar_ratio": m.calmar_ratio if m else 0,
                "max_drawdown": m.max_drawdown if m else 0,
                "max_drawdown_duration": m.max_drawdown_duration if m else 0,
                "win_rate": m.win_rate if m else 0,
                "profit_factor": m.profit_factor if m else 0,
                "total_trades": m.total_trades if m else 0,
                "var_95": m.value_at_risk_95 if m else 0,
                "cvar_95": m.conditional_var_95 if m else 0,
            } if m else {},
            "attribution": {
                "by_symbol": att.by_symbol,
                "by_signal_type": att.by_signal_type,
            } if att else {},
            "open_orders": orders,
        }

    # --- Sync wrappers for backward compatibility ---

    @property
    def portfolio(self) -> PortfolioState:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_get_portfolio())
        finally:
            loop.close()

    @portfolio.setter
    def portfolio(self, value: PortfolioState):
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self.async_set_portfolio(value))
        finally:
            loop.close()

    @property
    def signals(self) -> Optional[SignalMatrix]:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_get_signals())
        finally:
            loop.close()

    @signals.setter
    def signals(self, value: SignalMatrix):
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self.async_set_signals(value))
        finally:
            loop.close()

    @property
    def metrics(self) -> Optional[PerformanceMetrics]:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_get_metrics())
        finally:
            loop.close()

    @metrics.setter
    def metrics(self, value: PerformanceMetrics):
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self.async_set_metrics(value))
        finally:
            loop.close()

    @property
    def attribution(self) -> Optional[AttributionResult]:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_get_attribution())
        finally:
            loop.close()

    @attribution.setter
    def attribution(self, value: AttributionResult):
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self.async_set_attribution(value))
        finally:
            loop.close()

    @property
    def open_orders(self) -> list[dict]:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_get_open_orders())
        finally:
            loop.close()

    def set_open_orders(self, orders: list[dict]):
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self.async_set_open_orders(orders))
        finally:
            loop.close()

    @property
    def portfolio_history(self) -> list[dict]:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_get_portfolio_history())
        finally:
            loop.close()

    @property
    def trades(self) -> list[dict]:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_get_trades())
        finally:
            loop.close()

    def add_trade(self, trade: dict):
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self.async_add_trade(trade))
        finally:
            loop.close()

    def snapshot(self) -> dict:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(self.async_snapshot())
        finally:
            loop.close()


app_state = AppState()


async def seed_demo_data():
    """Populate AppState with realistic demo data for development."""
    from datetime import timedelta
    now = datetime.utcnow()

    # --- Positions ---
    positions = {
        "AAPL": Position(symbol="AAPL", quantity=150, side=OrderSide.BUY, entry_price=198.50, current_price=205.30, unrealized_pnl=1020.0, realized_pnl=0.0),
        "MSFT": Position(symbol="MSFT", quantity=80, side=OrderSide.BUY, entry_price=425.20, current_price=438.90, unrealized_pnl=1096.0, realized_pnl=0.0),
        "GOOGL": Position(symbol="GOOGL", quantity=60, side=OrderSide.BUY, entry_price=172.80, current_price=181.50, unrealized_pnl=522.0, realized_pnl=0.0),
        "NVDA": Position(symbol="NVDA", quantity=40, side=OrderSide.BUY, entry_price=795.00, current_price=856.20, unrealized_pnl=2448.0, realized_pnl=0.0),
        "TSLA": Position(symbol="TSLA", quantity=50, side=OrderSide.BUY, entry_price=242.60, current_price=238.10, unrealized_pnl=-225.0, realized_pnl=0.0),
        "SPY": Position(symbol="SPY", quantity=30, side=OrderSide.BUY, entry_price=532.00, current_price=539.40, unrealized_pnl=222.0, realized_pnl=0.0),
    }
    total_value = 84500.0 + sum(p.quantity * p.current_price for p in positions.values())
    portfolio = PortfolioState(
        cash=84500.0,
        positions=positions,
        total_value=total_value,
    )

    # --- Signals ---
    signals = SignalMatrix(
        timestamp=now,
        signals={
            "AAPL": [
                QuantSignal(type=SignalType.TREND, direction=SignalDir.BULLISH, strength=0.75, confidence=0.82, symbol="AAPL", timeframe="1d", timestamp=now, price=205.30),
                QuantSignal(type=SignalType.SUPPORT_RESISTANCE, direction=SignalDir.BULLISH, strength=0.60, confidence=0.70, symbol="AAPL", timeframe="1d", timestamp=now, price=205.30, level=200.0),
            ],
            "MSFT": [
                QuantSignal(type=SignalType.TREND, direction=SignalDir.BULLISH, strength=0.80, confidence=0.85, symbol="MSFT", timeframe="1d", timestamp=now, price=438.90),
                QuantSignal(type=SignalType.VOLATILITY, direction=SignalDir.NEUTRAL, strength=0.30, confidence=0.65, symbol="MSFT", timeframe="1d", timestamp=now, price=438.90),
            ],
            "NVDA": [
                QuantSignal(type=SignalType.ML_TRENDLINE, direction=SignalDir.BULLISH, strength=0.90, confidence=0.88, symbol="NVDA", timeframe="1d", timestamp=now, price=856.20),
            ],
            "TSLA": [
                QuantSignal(type=SignalType.TREND, direction=SignalDir.BEARISH, strength=0.55, confidence=0.60, symbol="TSLA", timeframe="1d", timestamp=now, price=238.10),
            ],
        },
        composite_scores={"AAPL": 0.72, "MSFT": 0.78, "GOOGL": 0.65, "NVDA": 0.88, "TSLA": 0.35, "SPY": 0.68},
        regime=RegimeState(
            primary=RegimeType.BULL_TREND,
            confidence=0.78,
            vol_regime="low",
            trend_regime="uptrend",
        ),
    )

    # --- Metrics ---
    metrics = PerformanceMetrics(
        total_return=0.1845,
        annualized_return=0.2210,
        cumulative_return=0.1845,
        alpha=0.0420,
        beta=0.95,
        benchmark_return=0.1520,
        annualized_volatility=0.1850,
        max_drawdown=-0.1240,
        max_drawdown_duration=45,
        value_at_risk_95=-0.0280,
        conditional_var_95=-0.0410,
        sharpe_ratio=1.19,
        sortino_ratio=1.52,
        calmar_ratio=1.78,
        win_rate=0.62,
        profit_factor=1.85,
        total_trades=248,
    )

    # --- Attribution ---
    attribution = AttributionResult(
        total_return=18450.0,
        by_symbol={"AAPL": 5200.0, "MSFT": 4100.0, "NVDA": 6800.0, "GOOGL": 1850.0, "TSLA": -1200.0, "SPY": 1700.0},
        by_signal_type={"trend": 8900.0, "ml_trendline": 6800.0, "s_r": 2750.0},
        long_contribution=18450.0,
        short_contribution=0.0,
    )

    # --- Open Orders ---
    open_orders = [
        {"id": "ord_001", "symbol": "AMD", "side": "buy", "type": "limit", "quantity": 100, "price": 162.50, "status": "open", "created_at": (now - timedelta(hours=2)).isoformat()},
        {"id": "ord_002", "symbol": "AMZN", "side": "buy", "type": "limit", "quantity": 50, "price": 188.00, "status": "open", "created_at": (now - timedelta(hours=1)).isoformat()},
        {"id": "ord_003", "symbol": "TSLA", "side": "sell", "type": "stop", "quantity": 50, "price": 225.00, "status": "open", "created_at": (now - timedelta(minutes=30)).isoformat()},
    ]

    # --- Trades ---
    trades = [
        {"id": "trade_001", "symbol": "AAPL", "side": "buy", "quantity": 150, "price": 198.50, "pnl": None, "timestamp": (now - timedelta(days=30)).isoformat(), "signal_type": "trend"},
        {"id": "trade_002", "symbol": "MSFT", "side": "buy", "quantity": 80, "price": 425.20, "pnl": None, "timestamp": (now - timedelta(days=25)).isoformat(), "signal_type": "trend"},
        {"id": "trade_003", "symbol": "NVDA", "side": "buy", "quantity": 40, "price": 795.00, "pnl": None, "timestamp": (now - timedelta(days=20)).isoformat(), "signal_type": "ml_trendline"},
        {"id": "trade_004", "symbol": "GOOGL", "side": "buy", "quantity": 60, "price": 172.80, "pnl": None, "timestamp": (now - timedelta(days=15)).isoformat(), "signal_type": "s_r"},
        {"id": "trade_closed_001", "symbol": "AAPL", "side": "sell", "quantity": 50, "price": 202.10, "pnl": 900.0, "timestamp": (now - timedelta(days=10)).isoformat(), "signal_type": "trend"},
        {"id": "trade_closed_002", "symbol": "NVDA", "side": "sell", "quantity": 10, "price": 840.00, "pnl": 450.0, "timestamp": (now - timedelta(days=5)).isoformat(), "signal_type": "ml_trendline"},
    ]

    # --- Portfolio History (equity curve, 90 data points) ---
    import random
    random.seed(42)
    history = []
    base_value = 98000.0
    for i in range(90):
        base_value *= (1 + random.uniform(-0.015, 0.018))
        history.append({
            "timestamp": (now - timedelta(days=90 - i)).isoformat(),
            "total_value": round(base_value, 2),
            "cash": 84500.0 - (i / 90) * 5000.0,
        })

    # --- Apply all seed data ---
    await app_state.async_set_portfolio(portfolio)
    await app_state.async_set_signals(signals)
    await app_state.async_set_metrics(metrics)
    await app_state.async_set_attribution(attribution)
    await app_state.async_set_open_orders(open_orders)
    app_state._trades = trades
    app_state._portfolio_history = history
    logger.info("Demo data seeded: %d positions, %d signals, %d trades", len(positions), 5, len(trades))
