from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from core.errors import TradingEngineError

logger = logging.getLogger(__name__)

HAS_VECTORBT = False
try:
    import vectorbt as vbt

    HAS_VECTORBT = True
except ImportError:
    vbt: Any = None


class VectorBTEngine:
    def __init__(self, data: pd.DataFrame, freq: str = "1D"):
        if not HAS_VECTORBT:
            raise ImportError(
                "vectorbt is required. Install: pip install trading-engine[backtest]"
            )
        self.data = data
        self.freq = freq
        self._validate_data()

    def _validate_data(self):
        if not isinstance(self.data, pd.DataFrame):
            raise TradingEngineError("Data must be a pandas DataFrame")
        if "Close" not in self.data.columns and "close" not in self.data.columns:
            raise TradingEngineError("Data must contain 'Close' or 'close' column")

    @property
    def _close(self) -> pd.Series:
        return self.data.get("Close", self.data.get("close"))

    @property
    def _open(self) -> Optional[pd.Series]:
        return self.data.get("Open", self.data.get("open", None))

    @property
    def _high(self) -> Optional[pd.Series]:
        return self.data.get("High", self.data.get("high", None))

    @property
    def _low(self) -> Optional[pd.Series]:
        return self.data.get("Low", self.data.get("low", None))

    @property
    def _volume(self) -> Optional[pd.Series]:
        return self.data.get("Volume", self.data.get("volume", None))

    def run_cross_signals(
        self,
        fast_period: int = 10,
        slow_period: int = 30,
        direction: str = "both",
        **kwargs: Any,
    ) -> Dict[str, Any]:
        fast_ma = self._close.rolling(fast_period).mean()
        slow_ma = self._close.rolling(slow_period).mean()
        entries = fast_ma > slow_ma
        exits = fast_ma <= slow_ma
        if direction == "long":
            exits = fast_ma < slow_ma
        elif direction == "short":
            entries, exits = exits, entries
        return self._build_portfolio(entries, exits, **kwargs)

    def run_signal(
        self,
        entries: pd.Series,
        exits: pd.Series,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        pf = vbt.Portfolio.from_signals(
            self._close,
            entries=entries,
            exits=exits,
            open=self._open,
            high=self._high,
            low=self._low,
            **kwargs,
        )
        return self._analyze(pf)

    def run_multiple(
        self,
        entry_funcs: Dict[str, pd.Series],
        exit_funcs: Dict[str, pd.Series],
        **kwargs: Any,
    ) -> pd.DataFrame:
        results = {}
        for name in entry_funcs:
            entries = entry_funcs[name]
            exits = exit_funcs.get(name, ~entries)
            try:
                res = self.run_signal(entries, exits, **kwargs)
                results[name] = {
                    "total_return": res["total_return"],
                    "sharpe": res["sharpe"],
                    "max_drawdown": res["max_drawdown"],
                    "win_rate": res["win_rate"],
                    "total_trades": res["total_trades"],
                }
            except Exception as e:
                logger.warning("Signal %s failed: %s", name, e)
        return pd.DataFrame.from_dict(results, orient="index")

    def optimize_params(
        self,
        param_grid: Dict[str, List[Any]],
        direction: str = "both",
        n_jobs: int = -1,
        **kwargs: Any,
    ) -> pd.DataFrame:
        pf = vbt.Portfolio.from_signals(
            self._close,
            entries=self._close > self._close.rolling(10).mean(),
            exits=self._close <= self._close.rolling(10).mean(),
            **kwargs,
        )
        results = pf.total_return()
        return pd.DataFrame(results)

    def _compute_signals(self, entries: pd.Series, exits: pd.Series) -> pd.DataFrame:
        return pd.DataFrame({"entries": entries, "exits": exits})

    def _build_portfolio(
        self,
        entries: pd.Series,
        exits: pd.Series,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        pf = vbt.Portfolio.from_signals(
            self._close,
            entries=entries,
            exits=exits,
            open=self._open,
            high=self._high,
            low=self._low,
            **kwargs,
        )
        return self._analyze(pf)

    def _analyze(self, pf: Any) -> Dict[str, Any]:
        equity = pf.value()
        returns = pf.returns()
        trades = pf.trades()
        stats = pf.stats()

        drawdown = pf.drawdown()
        max_dd = float(drawdown.min()) if len(drawdown) > 0 else 0.0

        return_series = pf.returns()
        sharpe = float(stats.get("sharpe_ratio", stats.get("Sharpe Ratio", 0.0)))

        win_count = int(trades.count())
        win_rate = float(trades.win_rate()) if win_count > 0 else 0.0

        return {
            "total_return": float(stats.get("total_return", stats.get("Total Return", 0.0))),
            "sharpe": sharpe,
            "max_drawdown": max_dd,
            "win_rate": win_rate,
            "total_trades": win_count,
            "equity_curve": equity.tolist() if hasattr(equity, "tolist") else list(equity),
            "returns": return_series.tolist() if hasattr(return_series, "tolist") else list(return_series),
        }
