from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np


@dataclass
class AttributionResult:
    """Performance attribution breakdown."""
    total_return: float = 0.0
    by_symbol: dict[str, float] = field(default_factory=dict)
    by_signal_type: dict[str, float] = field(default_factory=dict)
    long_contribution: float = 0.0
    short_contribution: float = 0.0
    allocation_effect: float = 0.0
    selection_effect: float = 0.0


class AttributionAnalyzer:
    """Decompose portfolio returns into sources."""

    def __init__(self):
        self._trade_log: list[dict] = []

    def record_trade(self, trade: dict):
        self._trade_log.append(trade)

    def analyze_symbol(self, symbol: str) -> float:
        symbol_trades = [t for t in self._trade_log if t.get("symbol") == symbol]
        return sum(t.get("pnl", 0.0) for t in symbol_trades)

    def analyze_signal_type(self, signal_type: str) -> float:
        type_trades = [t for t in self._trade_log if t.get("signal_type") == signal_type]
        return sum(t.get("pnl", 0.0) for t in type_trades)

    def compute(self, benchmark_returns: Optional[np.ndarray] = None) -> AttributionResult:
        if not self._trade_log:
            return AttributionResult()

        total = sum(t.get("pnl", 0.0) for t in self._trade_log)
        by_symbol: dict[str, float] = {}
        by_signal: dict[str, float] = {}
        long_pnl = 0.0
        short_pnl = 0.0

        for t in self._trade_log:
            sym = t.get("symbol", "unknown")
            sig = t.get("signal_type", "unknown")
            pnl = t.get("pnl", 0.0)
            side = t.get("side", "long")

            by_symbol[sym] = by_symbol.get(sym, 0.0) + pnl
            by_signal[sig] = by_signal.get(sig, 0.0) + pnl
            if side == "long":
                long_pnl += pnl
            else:
                short_pnl += pnl

        return AttributionResult(
            total_return=total,
            by_symbol=by_symbol,
            by_signal_type=by_signal,
            long_contribution=long_pnl,
            short_contribution=short_pnl,
        )
