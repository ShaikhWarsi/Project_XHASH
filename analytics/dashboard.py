from __future__ import annotations

from datetime import datetime
from typing import Optional

from core.types import PortfolioState, SignalMatrix

from .attribution import AttributionResult
from .metrics import PerformanceMetrics


class Dashboard:
    """Live trading dashboard - provides snapshot data for the frontend."""

    def __init__(self):
        self._portfolio_history: list[dict] = []

    def snapshot(
        self,
        portfolio: PortfolioState,
        signals: Optional[SignalMatrix] = None,
        metrics: Optional[PerformanceMetrics] = None,
        attribution: Optional[AttributionResult] = None,
        open_orders: Optional[list] = None,
    ) -> dict:
        self._portfolio_history.append({
            "timestamp": datetime.utcnow(),
            "total_value": portfolio.total_value,
            "cash": portfolio.cash,
        })

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "portfolio": {
                "total_value": portfolio.total_value,
                "cash": portfolio.cash,
                "long_exposure": portfolio.long_exposure,
                "short_exposure": portfolio.short_exposure,
                "gross_exposure": portfolio.gross_exposure,
                "net_exposure": portfolio.net_exposure,
                "positions": [
                    {
                        "symbol": p.symbol,
                        "quantity": p.quantity,
                        "side": p.side.value,
                        "entry_price": p.entry_price,
                        "current_price": p.current_price,
                        "unrealized_pnl": p.unrealized_pnl,
                        "realized_pnl": p.realized_pnl,
                    }
                    for p in portfolio.positions.values()
                ],
            },
            "signals": signals.to_dict() if signals else {},
            "metrics": {
                "sharpe_ratio": metrics.sharpe_ratio if metrics else None,
                "max_drawdown": metrics.max_drawdown if metrics else None,
                "total_return": metrics.total_return if metrics else None,
            } if metrics else {},
            "attribution": attribution if attribution else {},
            "open_orders": open_orders or [],
        }
