from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime
from typing import Optional

from analytics.attribution import AttributionResult
from analytics.metrics import PerformanceMetrics
from core.types import PortfolioState, SignalMatrix

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
